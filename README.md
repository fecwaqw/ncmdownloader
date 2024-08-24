# ncmdownloader
用于下载网易云歌单中音乐的脚本

依赖requests、pyncm、eyed3、tqdm库

支持为音乐添加封面、标题、作者、专辑

支持多线程下载，默认5线程，可在main.py中的MAX_WORKER处修改

运行main.py，输入网易云账号绑定的邮箱和密码，选择要下载的歌单即可
