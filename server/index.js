import axios from 'axios'
import express from 'express'
import {Logger} from './utils/index.js'
import path from 'path';
const __dirname = path.resolve();

const port = process.env.PORT || 3800

const app = express()

app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.set('trust proxy', true) // proxy remote client address

let answer = {}
const asyncHandler = fn => (req, res, next) =>
    Promise
    .resolve(fn(req, res, next))
    .catch(next)

app.use((req, res, next) => {
    // console.log('Request started:', new Date())
    // const user = JSON.stringify(req.query, null, 2)
    // console.log(user)
    next()
})
app.use(express.static(__dirname + '/public'));

app.get('/', asyncHandler(async (req, res, next) => {
        try {
            answer = {}
            await checkProxy(req.query)
            // res.send({code:'200'})
            res.send(answer)
            next()
        } catch (error) {
            Logger.error('app.get')
            Logger.error(error)
            next(error)
        }
    })
)
app.get('/test', asyncHandler(async (req, res, next) => {
    try {
        const someData = {
            ip: req.ip, data: 'hello', 
            data1: req.header('X-Real-IP'),
            data2: req.connection.remoteAddress, 
            data3: req.hostname, 
            data4: req.headers['x-forwarded-for'],
            data5: req.socket.remoteAddress,
    }
        await res.send(someData)
        next()
    } catch (error) {
    }
})
)
app.use((req, res, next) => {
    // console.log('Request ended:', new Date())
    next()
})

app.listen(port, '0.0.0.0' ) //() => console.log("server running on port " + port)
console.log("server running on port " + port)
// http://api.myip.com
// http://api.ipify.org?format=json
// http://ip-api.com/json

// 116.202.81.208:10040:admin:chigurh
const checkProxy = async (data) => {
    const proxy1 = data
// const proxy = data
    // console.log(proxy)
    await axios.get('http://api.ipify.org?format=json', {
            proxy: {
                host: proxy1.host,
                port: proxy1.port,
                auth: {username: proxy1.username, password: proxy1.password}
            }
        })
        .then((res) => {
            const {data, status, config} = res
            const {host, port, auth} = config.proxy
            const user = `${host}:${port}:${auth.username}:${auth.password}`
            // console.log(data)
            answer = {data, 'code': status, 'user': user }
            return {data, 'code': status, 'user': user }
        })
        .catch(err =>{
            try {
                
                let {message, code, config, response} = err
                
                let {host, port, auth} = config.proxy
                console.log('catch ' + port)
                let reason
                if (code){
                    reason = code
                } else {reason = response.statusText}
                const user = `${host}:${port}:${auth.username}:${auth.password}`
                answer = {'error': 'true', 'user': user, 'code': reason }
                // const answer = `${host}:${port}:${auth.username}:${auth.password}|${code}`
                return {'error': 'true', 'user': user, 'code': reason }
            } catch (error) {
                console.log('error')
                Logger.error('checkProxy')
                Logger.error(error)
            }
        })
}