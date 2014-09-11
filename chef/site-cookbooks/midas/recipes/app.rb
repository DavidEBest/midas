
directory node.midas.deploy_dir do
#  owner node.midas.user
#  group node.midas.group
  recursive true
  mode 0770
  action :create
end

git node.midas.deploy_dir do
  repository node.midas.git_repo
  checkout_branch node.midas.git_branch
  revision node.midas.revision
  enable_submodules true
  action :sync
end

# client config
execute 'client config' do
 command <<-HERE
  cp -n login.ex.json login.json
 HERE
  cwd "#{node.midas.deploy_dir}/assets/js/backbone/config/"
end

execute 'install code dependencies' do 
  command <<-HERE
    npm install -g grunt-cli
    npm install -g forever 
    npm link sails-postgresql
    npm install
    make build
  HERE
  cwd node.midas.deploy_dir
end

execute 'server config' do
 command <<-HERE
  cp -n local.ex.js local.js
 HERE
  cwd "#{node.midas.deploy_dir}/config"
end

bash 'server config/settings' do
 code <<-HERE
  for file in *.ex.js; do cp -n "$file" "${file/ex./}"; done
 HERE
  cwd "#{node.midas.deploy_dir}/config/settings"
end


file "#{node.midas.nginx_conf_dir}/#{node.midas.nginx_default}" do
  action :delete
end

link "#{node.midas.nginx_conf_dir}/midas.conf" do
  to "#{node.midas.deploy_dir}/#{node.midas.nginx_conf_source}"
  action :create
end

bash 'startup' do
 code <<-HERE
    make init
    make demo
    forever restart app.js --prod
 HERE
  cwd node.midas.deploy_dir
end

service "nginx" do
  action :restart
end
