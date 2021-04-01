const http = require('http')
const url = require('url')
const fs = require('fs')
const client = require('prom-client')// Create a Registry which registers the metrics
const register = new client.Registry()// Add a default label which is added to all metrics
const path = require('path')
register.setDefaultLabels({
 	// app: 'example-nodejs-app'
})
const ARRAY_LENGTH = 240
const randomArray = []

const dirname = path.resolve()
const statusFile = path.join(dirname, '../tasker/status.txt')

// client.collectDefaultMetrics({ register })//  Enable the collection of default metrics

const httpRequestDurationMicroseconds = new client.Histogram({
	name: 'testhisto7',
	help: 'Duration of HTTP requests in microseconds',
	labelNames: ['port'],
	buckets: [0]
}) // Register the histogram

const counter = new client.Counter({
	name: 'metric_name',
	help: '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
})

const host_192_168_1_1 = new client.Gauge({
	name: 'host_192_168_1_1',
	help: '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
})

const host_192_168_1_1_total = new client.Gauge({
	name: 'host_192_168_1_1_total',
	help: '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
})

counter.inc() // Increment by 1
counter.inc(10) // Increment by 10


register.registerMetric(counter)// Define the HTTP server
register.registerMetric(httpRequestDurationMicroseconds)// Define the HTTP server
register.registerMetric(host_192_168_1_1)// Define the HTTP server
register.registerMetric(host_192_168_1_1_total)// Define the HTTP server
const server = http.createServer(async (req, res) => {
    // Start the timer
	const end = httpRequestDurationMicroseconds.startTimer()  // Retrieve route from request object
	const route = url.parse(req.url).pathname  
	if (route === '/metrics') {
		let a
		let ports = {}
		for (let index = 0; index < ARRAY_LENGTH; index++) {
			let key = `port:${index}`
			ports[key]=(Math.floor(Math.random() * Math.floor(2))) 
			randomArray.push(ports)
			end({ port: `${index}`}, (Math.floor(Math.random() * Math.floor(2))))
		}

		a = Object.values(httpRequestDurationMicroseconds.hashMap)
		a.forEach((val, ind)=>{
			val.count = (Math.floor(Math.random() * Math.floor(2)))
			console.log(val, ind)
		})

		httpRequestDurationMicroseconds.hashMap=a

		let readedFromStatus = `\n`


		host_192_168_1_1.set(Math.floor(Math.random() * Math.floor(100)))
		host_192_168_1_1_total.set(100)
		let portsString = `\n`
		// for(let value of randomArray){
		// 	let key
		// 	portsString=+`${value.port}: ${value}`
		// }
		res.setHeader('Content-Type', register.contentType)

		let answer = await register.metrics()

		new Promise((resolve, reject) => {
			fs.readFile(statusFile, "utf-8", (err, data)=>{
				console.log(err || "readed from status" )
				err ? reject('1') : null
				readedFromStatus = data
				resolve('1')
			})
		})
		.then(()=>{
			res.end(answer.toString().concat(portsString).concat(readedFromStatus))
		}).catch(()=>{
			res.end(answer.toString().concat(portsString))
		})
		
		randomArray.length = 0
		httpRequestDurationMicroseconds.hashMap = {}
	}  // End timer and add labels
	// end({ route, code: res.statusCode, method: req.method })
})// Start the HTTP server which exposes the metrics on http://localhost:8080/metrics
server.listen(9091)