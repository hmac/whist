{exec} = require 'child_process'

compile = () ->
	coffee = exec 'coffee -c client/client.coffee', (err, stdout, stderr) ->
		throw err if err
		console.log stdout + stderr


run = () ->
	coffee = exec 'coffee server/server.coffee', (err, stdout, stderr) ->
		throw err if err
		console.log stdout + stderr

task 'build', 'Compile client.coffee and run server', ->
	compile()
	run()