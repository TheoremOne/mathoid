require 'json'
require 'rest-client'
require 'sinatra'
require 'sinatra/json'


class MathoidApp < Sinatra::Base
  before do
    headers 'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => ['OPTIONS', 'GET', 'POST']
  end

  get '/' do
    erb :index
  end

  options '/equation.json' do; 200;     end
  get     '/equation.json' do; as_json; end
  post    '/equation.json' do; as_json; end

  options '/equation.svg' do; 200;    end
  get     '/equation.svg' do; as_svg; end
  post    '/equation.svg' do; as_svg; end

  options '/equation.mml' do; 200;    end
  get     '/equation.mml' do; as_mml; end
  post    '/equation.mml' do; as_mml; end

  options '/equation.html' do; 200;     end
  get     '/equation.html' do; as_html; end
  post    '/equation.html' do; as_html; end

  error 404 do
    status(404)
    json({success: false, message: 'Not found'})
  end

  error 500 do |err|
    status(500)
    json({success: false, message: err.to_s})
  end

  private

  def get_type(equation)
    equation =~ %r{<\w+>.*</\w+>} ? :mml : :latex
  end

  def process_equation
    equation = params[:math].strip
    type = get_type(equation)

    if type == :mml
      equation = equation.gsub(%r{<math[^>]*>}, '').gsub(%r{</math>}, '')
      equation = "<math>#{equation}</math>"
    elsif type == :latex
      equation = "\\[#{equation}\\]" unless equation =~ %r{^\\[\[\(].*\\[\]\)]$}
    end

    out = RestClient.post("http://localhost:#{ENV['PHANTOM_PORT']}",
                          {math: equation})
    out = JSON.parse(out, symbolize_names: true)
    halt(400, JSON.dump(out)) unless out[:success]
    out[:mml] = out[:mml].split.join(' ').gsub(/> +</, '> <') if out[:mml]
    out[:type] = type
    out
  rescue => err
    halt 400, err.to_s
  end

  def as_json
    json(process_equation, content_type: 'application/json; charset=utf-8')
  end

  def as_svg
    headers 'Content-Type' => 'image/svg+xml; charset=utf-8'
    process_equation[:svg]
  end

  def as_mml
    headers 'Content-Type' => 'text/mml; charset=utf-8'
    process_equation[:mml]
  end

  def as_html
    wrapper = params[:wrapper] || 'span'
    eq = process_equation

    attrs = {}
    attrs['condition'] = eq[:input] if eq[:type] == :latex
    attrs['mml'] = eq[:mml].gsub(/"/, "'")
    attrs = attrs.map{|k, v| "data-#{k}=\"#{v}\""}.join(' ')

    "<#{wrapper} #{attrs}>#{eq[:svg]}</#{wrapper}>"
  end
end
