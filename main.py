from pyncm import apis
import os
import requests
import json


def download(url, path):
    file = requests.get(url, stream=True)
    with open(path, 'wb+') as f:
        for chunk in file.iter_content(chunk_size=1024):
            if chunk:
                f.write(chunk)


email = input('请输入网易云账号绑定的电子邮箱:')
password = input('请输入密码:')
apis.login.LoginViaEmail(email, password)
playlists = apis.user.GetUserPlaylists()
for i, playlist in enumerate(playlists['playlist']):
    print(i + 1, playlist['name'], sep='.')
select_playlist_num = int(input('请输入选择下载歌单的编号:')) - 1
select_playlist_id = playlists['playlist'][select_playlist_num]['id']
select_playlist_name = playlists['playlist'][select_playlist_num]['name'].replace(
    '/', '_')
try:
    os.mkdir(select_playlist_name)
except:
    files = os.listdir(select_playlist_name)
    for file in files:
        os.remove('%s/%s' %
                  (select_playlist_name, file))
songs = apis.playlist.GetPlaylistInfo(select_playlist_id)['privileges']
songs = apis.track.GetTrackDetail([id['id'] for id in songs])['songs']
songs_names = [name['name'] for name in songs]
songs_urls = []
for id in songs:
    tmp = id['id']
    tmp = f'http://music.163.com/api/song/enhance/player/url?id={tmp}&ids=%5B{tmp}%5D&br=3200000'
    tmp = json.loads(requests.get(tmp).text)['data'][0]['url']
    songs_urls.append(tmp)
for i in range(len(songs_names)):
    if songs_urls[i] != None:
        path = select_playlist_name + '/' + songs_names[i] + '.mp3'
        print(songs_names[i])
        download(songs_urls[i], path)
