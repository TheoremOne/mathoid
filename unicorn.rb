PROJECT_ROOT = File.expand_path(File.dirname(__FILE__))
MATHOID_FILES = '/srv/mathoid'
MATHOID_PORT = ENV['MATHOID_PORT'] || 7090
IS_LOCAL = ENV['RACK_ENV'] == 'development'

working_directory PROJECT_ROOT
worker_processes IS_LOCAL ? 2 : 4
preload_app false
# Set a higher timeout when in vagrant VM, otherwise the workers are killed by
# timeout when sprockets compiles the assets
timeout IS_LOCAL ? 300 : 30
listen "127.0.0.1:#{MATHOID_PORT}"
pid MATHOID_FILES + "/pids/unicorn-#{MATHOID_PORT}.pid"
stderr_path MATHOID_FILES + "/log/error-#{MATHOID_PORT}.log"
stdout_path MATHOID_FILES + "/log/access-#{MATHOID_PORT}.log"

before_fork do |server, worker|
  old_pid = MATHOID_FILES + "/pids/unicorn-#{MATHOID_PORT}.oldbin"
  if File.exists?(old_pid) && server.pid != old_pid
    begin
      Process.kill('QUIT', File.read(old_pid).to_i)
    rescue Errno::ENOENT, Errno::ESRCH
      # someone else did our job for us
    end
  end

  sleep 1
end
