# ncmdownloader

用于下载网易云歌单中音乐的脚本

# 安装依赖

运行`pnpm install`安装依赖

# 登录方式

需要自己去网易云音乐官网获取cookie

# 支持功能

- 为音乐添加封面、标题、作者、专辑
- 下载歌词
- 并发下载

# 使用方法

运行`node main.js`，输入要下载的歌单Id即可下载

# 配置文件

修改`config.yml`

- maxBitrateLevel: 下载歌曲的最高质量，不填写内容默认为可下载的最高质量

    可填内容:
    - higher: 较高
    - exhigh: 极高
    - lossless: 无损
    - hires: Hi-Res
    - jyeffect: 高清环绕声
    - sky: 沉浸环绕声
    - dolby: 杜比全景声
    - jymaster: 超清母带

- downloadSongs: 是否下载歌曲

    可填内容:
    - true: 下载歌曲
    - false: 不下载歌曲

- downloadLyrics: 是否下载歌词

    可填内容:
    - true: 下载歌词
    - false: 不下载歌词

- concurrency: 同时下载的任务数

    可填内容: 正整数(不建议设置太大)

- retry: 下载失败时的重试次数

    可填内容: 正整数

- retryDelay: 下载失败时的重试间隔时间

    可填内容: 正整数(单位：毫秒)

- timeout: 下载超时时间

    可填内容: 正整数(单位：毫秒)

- cookie: 网易云音乐的cookie

    可填内容: 字符串(网易云音乐的cookie,一般包含"MUSIC_U=xxxx")
