default.midas.user = "midas"
default.midas.group = "midas"
default.midas.user_home = "/home/midas"
default.midas.deploy_dir = "/var/www/midas"
default.midas.git_repo = "https://github.com/18F/midas.git"
default.midas.git_branch = "deploy"  # create a branch on server with this name
default.midas.git_revision = "master" # branch, tag, sha to deploy
default.midas.nginx_conf_dir = "/etc/nginx/vhosts"
default.midas.nginx_default = "default.conf"
default.midas.nginx_conf_source = "tools/nginx/test-server.conf"



default.postgresql.database.name = 'midas' 
default.postgresql.database.encoding = 'unicode'
default.postgresql.databases = [
  { name: 'midas', owner: 'midas' }
]
default.postgresql.users = [
  {
    username: "midas",
    password: "midas",
    superuser: false,
    createdb: true,
    login: true
  }
]
default.postgresql.pg_hba = [
#  {
#    type: 'local',
#    db: 'all',
#    user: 'all',
#    addr: '',
#    method: 'md5' 
#  },
  {
    type: 'hostssl',
    db: 'all',
    user: 'all',
    addr: '0.0.0.0/0',
    method: 'md5' 
  }
]
default.postgresql.password = ''
