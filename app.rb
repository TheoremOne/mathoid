require 'json'
require 'sinatra'
require 'sinatra/json'


class MathoidApp < Sinatra::Base
  get  '/equation.json' do; as_json; end
  post '/equation.json' do; as_json; end
  get  '/equation.svg'  do; as_svg;  end
  post '/equation.svg'  do; as_svg;  end
  get  '/equation.mml'  do; as_mml;  end
  post '/equation.mml'  do; as_mml;  end
  get  '/equation.html' do; as_html; end
  post '/equation.html' do; as_html; end

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
      equation = "\\[#{equation}\\]" unless equation =~ %r{\\[\[\(].*\\[\]\)]}
    end

    out = `phantomjs ./mathjax.js -e "#{equation.shellescape}"`
    out = JSON.parse(out, symbolize_names: true) if out
    out[:mml] = out[:mml].split.join(' ').gsub(/> +</, '> <') if out[:mml]
    out[:type] = type
    out
  end

  def as_json
    json process_equation
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
