# Установить:

Prometheus https://prometheus.io/docs/prometheus/latest/getting_started/

Grafana https://grafana.com/docs/grafana/latest/installation/

Node https://nodejs.org/en/

# Проект

promserver, server, tasker это три приложения

Скопировать все из архива в любую папку

В пути для папки (...promserver, .../server/ и .../tasker/) прописать команду (через cmd/powershell) которая установить библиотеки для работы
```
npm install
```

нужно получить credentials и заменить ими credentials.json в tasker 
https://developers.google.com/workspace/guides/create-credentials

при первом запуске tasker в терминале будет гугл ссылка для создания токена (просто перейти и подтвердить свой gmail) и появиться файл token.json, дальше уже все будет работать

# Старт

Для включения любого нужно прописывать 
```
npm run start
```

# Проверка

Для проверки:
promserver (по дефолту localhost:9091/metrics)
server (по дефолту localhost:3800/test)
tasker перезаписывает файл status.txt и пишет лог в терминал

# Что делают

promserver по адресу передает данные состояния, а сам prometheus уже их читает, а дальше grafana делает запросы к хранилищу prometheus, а сами данные читает из соседней папки tasker/status.txt

server просто отвечает адресом прокси, и по адресу /imagе.jpg картинкой

tasker отправляет запросы на server и по ответу пишет файл status.txt и готовит отчет в бота

# Настройки

promserver/index.js: 
server.listen(9091) //103 строчка - порт promserver

server/index.js: 
const port = process.env.PORT || 3800 //7 строчка - порт server

tasker: 
const TG_TOKEN = '1419501577:AAEXUzLOc9qPQiH958Z3mJaUs4R-VuM33mQ' //10 строчка - телеграмм токен
const admins = [194217241, 151171820, 129568643] //13 строчка - телеграмм id кому присылать
spreadsheetId: '1jT1YVDCQm5j_BlLROUZrParnTiC3jUzpI8AVN7pEi10', //80 строчка - ссылка на google sheet
range: 'Proxylist!A2:D10000', //81 строчка - область которую читать из sheet
const server = process.env.IP || "192.168.1.1" //100 строчка - ip именно server (не локальный а именно белый)
const port = process.env.PORT || 3000 //101 строчка - порт имено server

# Важно
1. Установить все три приложения чтобы npm run start не выдавал ошибок
2. Получить credentials и создать token при запуске
3. Правильно указать настройки
4. У Prometheus в конфиге и у promserver должен бьть один порт promserver/index.js последняя строчка server.listen(9091) и в папке prometheus должен быть его конфиг prometheus.yml в конце файла у него порт с которого он читает (static_configs: targets: ['localhost:9091'])

# Комментарий

Лично у меня проект лежал в папке /opt/node-apps/(promserver, server, tasker)
и были прописаны .service для них (если что-то падало то нужно было только server перезапускать)