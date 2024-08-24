from pyncm import apis
import eyed3
import os
import requests
import eyed3.id3
from eyed3.id3.frames import ImageFrame
from tqdm import tqdm
from concurrent import futures

MAX_WORKER = 5

def replace_special_char(s):
    specialChars = '/\:*?"<>|'
    for specialChar in specialChars:
        s = s.replace(specialChar, '')
    return s

def download(url, path, track_num, detail):
    file = requests.get(url, stream=True)
    with open(path, 'wb+') as f:
        for chunk in file.iter_content(chunk_size=1024):
            if chunk:
                f.write(chunk)
    audio = eyed3.load(path)
    if audio.tag is None:
        audio.initTag()
    audio.tag.title = detail['name']
    audio.tag.artist = '; '.join(detail['artists'])
    audio.tag.album = detail['album']['name']
    audio.tag.track_num = (track_num, track_num)
    audio.tag.images.set(ImageFrame.FRONT_COVER, requests.get(detail['album']['picUrl']).content, 'image/jpeg')
    audio.tag.save(version=eyed3.id3.ID3_V2_3, encoding='utf-8')


email = input('请输入网易云账号绑定的电子邮箱:')
password = input('请输入密码:')
apis.login.LoginViaEmail(email, password)
playlists = apis.user.GetUserPlaylists(0)
for i, playlist in enumerate(playlists['playlist']):
    print(i + 1, playlist['name'], sep='.')
select_playlist_num = int(input('请输入选择下载歌单的编号:')) - 1
select_playlist_id = playlists['playlist'][select_playlist_num]['id']
select_playlist_name = playlists['playlist'][select_playlist_num]['name'].replace(
    '/', '_')
dir_name = replace_special_char(select_playlist_name)
try:
    os.mkdir(dir_name)
except:
    files = os.listdir(dir_name)
    for file in files:
        os.remove('%s/%s' % (dir_name, file))
songs = apis.playlist.GetPlaylistInfo(select_playlist_id)['privileges']
songs = apis.track.GetTrackDetail([iter['id'] for iter in songs])['songs']
songs_ids = [iter['id'] for iter in songs]
songs_details = {}
for iter in songs:
    songs_details[iter['id']] = {'name': iter['name'], 'artists': [artist['name'] for artist in iter['ar']], 'album': {'name': iter['al']['name'], 'picUrl': iter['al']['picUrl']}}
songs_urls = {}
for iter in apis.track.GetTrackAudio([iter['id'] for iter in songs])['data']:
    songs_urls[iter['id']] = iter['url']

tasks,results = [], []
with futures.ThreadPoolExecutor(max_workers=MAX_WORKER) as executor:
    for i in range(len(songs_ids)):
        if songs_urls[songs_ids[i]] != None:
            file_name = ','.join(songs_details[songs_ids[i]]['artists']) + ' - ' + songs_details[songs_ids[i]]['name']
            file_name = replace_special_char(file_name)
            path = dir_name + '/' + file_name + '.mp3'
            tasks.append(executor.submit(download, songs_urls[songs_ids[i]], path, len(songs_ids) - i, songs_details[songs_ids[i]]))
    for task in tqdm(futures.as_completed(tasks), total=len(tasks)):
        results.append(task.result())
