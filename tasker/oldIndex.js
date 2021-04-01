import needle from 'needle'
import axios from 'axios'
import * as path from 'path'
import {readFileSync, readFile, writeFile} from 'fs'
import {oldMass} from './oldMASS.js'
import readline from 'readline'
import {default as pkg } from 'googleapis'
const {google} = pkg

const TG_TOKEN = '1419501577:AAEXUzLOc9qPQiH958Z3mJaUs4R-VuM33mQ'
// alpha = '1457457484:AAHxxVH4ArnmCxva6ptAx3C6bKMHZ4RopYA'
// production = '1419501577:AAEXUzLOc9qPQiH958Z3mJaUs4R-VuM33mQ' // 1287264817:AAF3cum4-3ii-Mt5lZYZlBt7r_LzSbRQJt4
const admins = [194217241, 151171820, 129568643]

const __dirname = path.resolve()
const filepath = path.join(__dirname, 'settings.json')

let REPORT = new Map()
let REPORT2 = new Map()

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(__dirname, 'token.json')

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

function authorize(credentials, callback) {
    return new Promise((resolve, reject)=>{
        const {client_secret, client_id, redirect_uris} = credentials.installed
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0])
    
        // Check if we have previously stored a token.
        readFile(TOKEN_PATH, (err, token) => {
            if (err) return getNewToken(oAuth2Client, callback)
            oAuth2Client.setCredentials(JSON.parse(token))
            callback(oAuth2Client).then(data=>{resolve(data)})
        })
    })
}

function getNewToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('Authorize this app by visiting this url:', authUrl)
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})
	rl.question('Enter the code from that page here: ', (code) => {
		rl.close()
		oAuth2Client.getToken(code, (err, token) => {
		if (err) return console.error('Error while trying to retrieve access token', err)
		oAuth2Client.setCredentials(token)
		// Store the token to disk for later program executions
		fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
			if (err) return console.error(err)
			console.log('Token stored to', TOKEN_PATH)
		})
		callback(oAuth2Client).then(data=>{resolve(data)})
		})
	})
}

function readSheet(auth) {
    return new Promise((resolve, reject)=>{
        const sheets = google.sheets({version: 'v4', auth})
        let RespArray = new Array()
        sheets.spreadsheets.values.get({
            spreadsheetId: '1jT1YVDCQm5j_BlLROUZrParnTiC3jUzpI8AVN7pEi10',
            range: 'Proxylist!A2:D10000',
        }, (err, res) => {
            let makeArray = ()=>{
                let rows = res.data.values
                if (rows.length) {
                    rows.map((row) => {
                        RespArray.push({host: row[0], port: row[1], username: row[2], password: row[3]})
                    })
                    resolve(RespArray)
                } else {
                console.log('No data found.')
                resolve(false)
                }
            }
            err ? 
            resolve(false) :
            makeArray()
        })
    })
}

const check = (timeInMins = 0.01)=>{
    let action = (MASS)=>{
        console.log(MASS.length)
        let promiseArray = []
        let prometeusString = ""
        MASS.forEach((proxy,index)=>{
            const proxyToKey = `${proxy.host}:${proxy.port}:${proxy.username}:${proxy.password}`
            const hostAndProxy = `${proxy.host}`.replace(/\./g, ':')
            promiseArray.push(new Promise((resolve, reject)=>{
                const task = (mytime=index * 5)=>{
                    setTimeout(()=>{
                        axios.get(`http://142.93.171.79:3800/test`, {
                            proxy: {
                                host: proxy.host,
                                port: proxy.port,
                                auth: {username: proxy.username, password: proxy.password}
                            },
                            timeout:20000
                        })
                        .then((res) => {
                            const msg = {proxy: proxyToKey}
                            deleteFromReport(msg)
                            prometeusString += `h${hostAndProxy}{port="${proxy.port}"} 1\n`
                            resolve()
                        })
                        .catch(error => {
                            let reason
                            try {
                                if (error.response) {reason = error.response.statusText ? error.response.statusText : error.response.status}
                                else if (error.code){
                                    reason = error.code == 'ECONNABORTED' ? "timeout" : error.code
                                } else if (error.message) {
                                    reason = error.message
                                }
                            } catch (bad) {
                                reason = "MY ERROR"
                            }
                            const msg = {proxy: proxyToKey, data: {
                                host: proxy.host, port: proxy.port,
                                username: proxy.username, password: proxy.password,
                                problem: reason}
                            }
                            addToReport(msg)
                            prometeusString += `h${hostAndProxy}{port="${proxy.port}"} 0\n`
                            resolve()
                        })
                    }, mytime)
                }
                task()
            }))
        })
        Promise.all(promiseArray).then(()=>{
            writeFile('status.txt', prometeusString, (err)=>{
                console.log(err || "writed")
            })
        })
    }
    console.log("check " + new Date())
    try {
        readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err)
            // Authorize a client with credentials, then call the Google Sheets API.
            authorize(JSON.parse(content), readSheet)
            .then(da => da ? action(da) : action(oldMass))
        })
    } catch (error) {
        action(oldMass)
    }
    try {
        const data = JSON.parse(readFileSync(filepath, 'utf-8', (err, data)=>{console.log()}))
        console.log("TimeBetweenReportsInMins " + data.TimeBetweenReportsInMins + " " + new Date())
        timeInMins = Math.floor(data.TimeBetweenReportsInMins/3)
        setTimeout(()=>{
            check(timeInMins)
        }, timeInMins *60 * 1000)
    } catch (error) {
        timeInMins = 3
        console.log("TimeBetweenReportsInMins: error")
        setTimeout(()=>{
            check(10)
        }, timeInMins * 60 * 1000)
    }
}

check()

const addToReport = (msg) => {
    const proxy = msg.proxy
    const data = msg.data
    REPORT.set(proxy, data)
}

const addToReport2 = (msg) => {
    const proxy = msg.proxy
    const data = msg.data
    REPORT2.set(proxy, data)
}

const deleteFromReport = (msg) => {
    REPORT.delete(msg.proxy)
    REPORT2.delete(msg.proxy)
}

function compare( a, b ) {
    const k1 = Object.keys(a)[0]
    const k2 = Object.keys(b)[0]
    return k1 >= k2 ? 1 : -1
}

function sendReport(info){
    const message = `${info}`
    for (const admin of admins) {
        const req = {
            text: message,
            chat_id: admin,
            parse_mode: 'HTML'
        }
        needle('POST', `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, req)
    }
}

const initial = async (delay=0)=>{
    REPORT.clear()
    let mytime=10
    try {
        const data = JSON.parse(readFileSync(filepath, 'utf-8', (err, data)=>{console.log('read settings')}))
        mytime = data.TimeBetweenReportsInMins
    } catch (error) {
        console.log("TimeBetweenReportsInMins: error")
    }
    console.log("initial " + new Date())
    new Date().getSeconds() > 30 ? delay+=10000 : null
    setTimeout(function(){
        try {
            const data = JSON.parse(readFileSync(filepath, 'utf-8', (err, data)=>{console.log()}))
            console.log("CheckNumbersBeforeReport " + data.CheckNumbersBeforeReport)
            recheck(data.CheckNumbersBeforeReport)
        } catch (error) {
            console.log("CheckNumbersBeforeReport: error")
            recheck(6)
        }
    }, mytime * 60 * 1000 - delay)
}

initial()

const newCheck = (ARRAY) => {
    console.log("newcheck")
    return new Promise((resol, reje)=>{
    let promiseArray = []
    ARRAY.forEach((element,index)=>{
        const proxy = Object.values(element)[0]
        const proxyToKey = `${proxy.host}:${proxy.port}:${proxy.username}:${proxy.password}`
        promiseArray.push(new Promise((resolve, reject)=>{
            axios.get(`http://142.93.171.79:3800/test`, {
                proxy: {
                    host: proxy.host,
                    port: proxy.port,
                    auth: {username: proxy.username, password: proxy.password}
                },
                timeout: 10000
            })
            .then((res) => {
                const msg = {proxy: proxyToKey}
                deleteFromReport(msg)
                resolve('1')
            })      
            .catch(error => {
                let reason
                try {
                    if (error.response) {reason = error.response.statusText ? error.response.statusText : error.response.status}
                    else if (error.code){
                        reason = error.code=='ECONNABORTED' ? 'timeout' : error.code
                    } else if (error.message) {
                        reason = error.message
                    }
                } catch (bad) {
                    reason = "MY ERROR"
                }
                const msg = {proxy: proxyToKey, data: {
                    host: proxy.host, port: proxy.port,
                    username: proxy.username, password: proxy.password,
                    problem: reason}
                }
                addToReport2(msg)
                resolve('1')
            })
        }))
    })
    Promise.all(promiseArray).then(()=>{resol(1)})}
)}

const recheck = async (number)=>{
    const t0 = new Date().getTime()
    console.log("recheck")
    let TimeBetweenCheckBeforeReport = 10
    try {
        const data = JSON.parse(readFileSync(filepath, 'utf-8', (err, data)=>{console.log()}))
        console.log("TimeBetweenCheckBeforeReport " + data.TimeBetweenCheckBeforeReport + " " + new Date())
        TimeBetweenCheckBeforeReport = data.TimeBetweenCheckBeforeReport * 1000
    } catch (error) {
        console.log("TimeBetweenCheckBeforeReport: error")
        TimeBetweenCheckBeforeReport *= 1000
    }
    REPORT2 = REPORT
    const array = Array.from(REPORT2, ([proxy, value]) => ({ [proxy]: value }))
    for (let index = 0; index < number; index++) {
        const array = Array.from(REPORT2, ([proxy, value]) => ({ [proxy]: value }))
        await new Promise((resolve, reject)=>{
            setTimeout(() => {
                newCheck(array)
                resolve('1')
            }, TimeBetweenCheckBeforeReport)
        }).then()
    }
    prepare(t0)
}

const prepare = (t0)=>{
    console.log("prepare")
    const array = Array.from(REPORT2, ([proxy, value]) => ({ [proxy]: value }))
    array.sort(compare)
    let message = ``
    array.forEach((elem, key)=>{
        const [value] = Object.entries(elem)
        // message += `${value[0]}|${value[1].problem}\n`
        message += `${value[1].problem}<code>:${value[0]}</code>\n`
        if(message.split('\n').length >=80){ //split message for lines > 80
            sendReport(message)
            message=`\n`
        }
    })
    message.length !=0 ? sendReport(message) : sendReport("ALL FINE")
    REPORT = new Map() // REPORT.clear() work bad in some cases
    REPORT2.clear()
    const t1 = new Date().getTime()
    initial(t1-t0)
}