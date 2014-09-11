
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
file "#{node.midas.deploy_dir}/assets/js/backbone/config/login.json" do
  content ::File.open("#{node.midas.deploy_dir}}/assets/js/backbone/config/login.ex.json").read
  action :create_if_missing
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

file "#{node.midas.deploy_dir}/config/local.js" do
  content ::File.open("#{node.midas.deploy_dir}/config/local.ex.js").read
  action :create_if_missing
end

bash 'settings' do
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
