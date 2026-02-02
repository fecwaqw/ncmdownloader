const yaml = require("js-yaml");
const readline = require("node:readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});
const ncmApi = require("NeteaseCloudMusicApi");
function question(query) {
    return new Promise((resolve) =>
        readline.question(query, (answer) => resolve(answer)),
    );
}
const { download, downloadBuffer, downloadLyric } = require("./download.js");
const fs = require("fs");
const path = require("node:path");
const ProgressBar = require("progress");
const { ID3Writer } = require("browser-id3-writer");
const pLimit = require("p-limit").default;
const defaultConfigContent = `maxBitrateLevel: "exhigh"
#maxBitrateLevel:下载歌曲的最高质量，不填写内容默认为可下载的最高质量
#可填内容:
# higher => 较高
# exhigh=>极高
# lossless=>无损
# hires=>Hi-Res
# jyeffect => 高清环绕声
# sky => 沉浸环绕声
# dolby => 杜比全景声
# jymaster => 超清母带
downloadSongs: true
#downloadSongs:是否下载歌曲
#可填内容:
# true => 下载歌曲
# false => 不下载歌曲
downloadLyrics: true
#downloadLyrics:是否下载歌词
#可填内容:
# true => 下载歌词
# false => 不下载歌词
concurrency: 3
#concurrency:同时下载的任务数
#可填内容:正整数(不建议设置太大)
retry: 3
#retry:下载失败时的重试次数
#可填内容:正整数
retryDelay: 1000
#retryDelay:下载失败时的重试间隔时间
#可填内容:正整数(单位：毫秒)
timeout: 30000
#timeout:下载超时时间
#可填内容:正整数(单位：毫秒)
cookie: ""
#cookie:网易云音乐的cookie
#可填内容:字符串(网易云音乐的cookie,一般包含"MUSIC_U=xxxx")
`;
function replaceSpecialCharacter(s) {
    const specialChars = ["/", ":", "*", "?", '"', "<", ">", "|", "\\"];
    specialChars.forEach((e) => {
        s = s.replaceAll(e, "");
    });
    return s;
}
function checkConfig(config) {
    const songQuality = [
        "standard",
        "higher",
        "exhigh",
        "lossless",
        "hires",
        "jyeffect",
        "sky",
        "dolby",
        "jymaster",
    ];
    if (!config.concurrency) throw new Error("未设置并发下载数！");
    if (!config.cookie) throw new Error("未设置登录cookie！");
    if (config.maxBitrateLevel) {
        if (!songQuality.includes(config.maxBitrateLevel))
            throw new Error("下载音乐的最高音质设置错误！");
    }
    if (!("downloadSongs" in config)) throw new Error("未选择是否下载音乐！");
    if (!("downloadLyrics" in config)) throw new Error("未选择是否下载歌词！");
    if (!config.retry) throw new Error("未设置下载重试次数！");
    if (!config.retryDelay) throw new Error("未设置下载重试间隔时间！");
    if (!config.timeout) throw new Error("未设置下载超时时间！");
}
function createDownloadDirectory(path) {
    try {
        fs.rmSync(path, { recursive: true });
    } catch (err) {
        if (!(err.code == "ENOENT")) throw err;
    }
    fs.mkdirSync(path, { recursive: true });
}
async function main() {
    if (!fs.existsSync("config.yml")) {
        fs.writeFileSync("config.yml", defaultConfigContent);
    }
    try {
        var config = yaml.load(fs.readFileSync("config.yml", "utf-8"));
    } catch (e) {
        console.log(
            "读取config.yml错误！可以删除config.yml再运行此程序以重新生成config.yml",
        );
        return;
    }
    try {
        checkConfig(config);
    } catch (e) {
        console.log(e.message);
        return;
    }
    const accountDetail = await ncmApi.user_account({ cookie: config.cookie });
    if (!accountDetail.body.account) {
        console.log("登录失败！请检查Cookie设置！");
        return;
    }
    console.log(`已以 ${accountDetail.body.profile.nickname} 身份成功登录！`);
    const playlistId = await question("请输入要下载的歌单Id:");
    const data = (
        await ncmApi.playlist_detail({ id: playlistId, cookie: config.cookie })
    ).body.playlist;
    if (!data) {
        console.log("歌单Id错误！");
        return;
    }
    const playlistName = data.name;
    const downloadPath = path.resolve(replaceSpecialCharacter(playlistName));
    createDownloadDirectory(downloadPath);
    console.log(`正在下载歌单 ${playlistName}`);
    const songDetails = (
        await ncmApi.playlist_track_all({
            id: playlistId,
            cookie: config.cookie,
        })
    ).body;
    const songs = Array.from({ length: songDetails.songs.length }, (_, k) => {
        const song = songDetails.songs[k];
        const privilege = songDetails.privileges[k];
        return {
            name: song.name,
            id: song.id,
            artists: Array.from(
                { length: song.ar.length },
                (_, k) => song.ar[k].name,
            ),
            album: song.al.name,
            albumPictureUrl: song.al.picUrl,
            translatedName: "tns" in song ? song.tns[0] : null,
            maxBitrateLevel: privilege.playMaxBrLevel,
        };
    });
    const bar = new ProgressBar("正在下载[:bar] :current/:total", {
        total: songs.length,
    });
    const failedSongs = {
        songs: [],
        lyrics: [],
    };
    const limit = pLimit(config.concurrency);
    const downloadSong = (song) =>
        limit(async () => {
            const songFileBaseName = replaceSpecialCharacter(
                `${song.name}${song.translatedName ? `(${song.translatedName})` : ""} - ${song.artists.join(", ")}`,
            );
            if (config.downloadSongs) {
                try {
                    const bitrateLevel =
                        config.maxBitrateLevel || song.maxBitrateLevel;
                    const data = (
                        await ncmApi.song_url_v1({
                            id: song.id,
                            level: bitrateLevel,
                            cookie: config.cookie,
                            timeout: config.timeout,
                        })
                    ).body.data[0];
                    const songUrl = data.url;
                    const songType = data.type;
                    const songFileName = `${songFileBaseName}.${songType}`;
                    const songPath = path.join(downloadPath, songFileName);
                    await download(
                        songUrl,
                        songPath,
                        config.retry,
                        config.retryDelay,
                        config.timeout,
                    );
                    const songCoverPicture = await downloadBuffer(
                        song.albumPictureUrl,
                        config.retry,
                        config.retryDelay,
                        config.timeout,
                    );
                    let songFile = fs.readFileSync(songPath);
                    const writer = new ID3Writer(songFile);
                    writer
                        .setFrame("TIT2", song.name)
                        .setFrame("TALB", song.album)
                        .setFrame("TPE1", song.artists)
                        .setFrame("APIC", {
                            type: 3,
                            data: songCoverPicture,
                            description: "",
                        });
                    if (song.translatedName)
                        writer.addTag("TIT3", song.translatedName);
                    writer.addTag();
                    songFile = Buffer.from(writer.arrayBuffer);
                    fs.writeFileSync(songPath, songFile);
                } catch (error) {
                    failedSongs.songs.push({
                        name: song.name,
                        artists: song.artists.join(", "),
                        error: error.message,
                    });
                }
            }
            if (config.downloadLyrics) {
                try {
                    const lyricFileName = `${songFileBaseName}.lrc`;
                    const lyricPath = path.join(downloadPath, lyricFileName);
                    const data = await downloadLyric(
                        song.id,
                        config.cookie,
                        config.retry,
                        config.retryDelay,
                    );
                    const lyricContent = data.lrc.lyric;
                    if (lyricContent) {
                        fs.writeFileSync(lyricPath, lyricContent);
                    }
                } catch (error) {
                    failedSongs.lyrics.push({
                        name: song.name,
                        artists: song.artists.join(", "),
                        error: error.message,
                    });
                }
            }
            bar.tick();
        });

    await Promise.all(songs.map(downloadSong));

    // Output failed songs
    console.log("\n下载完成！");
    if (failedSongs.songs.length > 0) {
        console.log("\n歌曲下载失败：");
        failedSongs.songs.forEach((s) => {
            console.log(`  - ${s.name} - ${s.artists}: ${s.error}`);
        });
    }
    if (failedSongs.lyrics.length > 0) {
        console.log("\n歌词下载失败：");
        failedSongs.lyrics.forEach((s) => {
            console.log(`  - ${s.name} - ${s.artists}: ${s.error}`);
        });
    }
    if (failedSongs.songs.length === 0 && failedSongs.lyrics.length === 0) {
        console.log("所有歌曲和歌词下载成功！");
    }
}

main().then(() => {
    process.stdin.destroy();
    process.stdout.destroy();
});
