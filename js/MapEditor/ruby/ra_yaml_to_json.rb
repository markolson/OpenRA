require 'rubygems'
require 'json'
require 'yaml'
=begin
tempHash = {
    "key_a" => "val_a",
    "key_b" => "val_b"
}

File.open("temp.json","w") do |f|
  f.write(tempHash.to_json)
end
=end

=begin
tree = YAML::parse( File.open( "snow.yaml" ) )
puts tree.type_id
# prints:
#   map

title = tree.select( "/title" )[0]
puts title.value
# prints:
#   YAML.rb

obj_tree = tree.transform
puts obj_tree['title']
# prints:
#   YAML.rb
#   
=end
base_file_name = "snow"
count = 0
out_hash = {};
last_template = nil

File.open( base_file_name + ".yaml" ).each do |line|
  
  if line.match(/\tTemplate@(\d+)*/)
    puts line.inspect  
    puts "id: #{$1}"
    out_hash[$1] = {:id => $1.to_i }
    last_template = $1
    count += 1
  end

  if line.match(/\t\tImage:\s*(\w+)\b/)
    puts "image: #{$1}"
    out_hash[last_template][:path] = $1 
  end

  if line.match(/\t\tSize:\s*(\d+),(\d+)/)
    puts "width: #{$1} height: #{$2}"
    out_hash[last_template][:width] = $1 
    out_hash[last_template][:height] = $2
  end

end
puts "------------------------"
puts "#{count} templates found"

File.open(base_file_name + ".json","w") do |f|
  f.write(out_hash.to_json)
end
