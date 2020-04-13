const express = require('express'),
  path = require('path'),
  dotenvconf = require('dotenv').config(),
  app = express(),
  api = require('covidapi')

if(dotenvconf.error || !process.env.NODE_ENV || !process.env.HTTP_PORT){
  console.error('invalid environment variables, please fix your .env file')
  process.exit(-1)
}

const isProduction = process.env.NODE_ENV === 'production'

app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')

app.use(require('morgan')(':date[web] | :remote-addr - :method :url :status :response-time ms - :res[content-length]'))
app.use(require('cookie-parser')())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(require('express-session')({ name: 'coviddetail-session', secret: process.env.SESSION_SECRET, cookie: { maxAge: parseInt(process.env.MAX_COOKIE_AGE) || 36e5 }, resave: false, saveUninitialized: true, httpOnly: true }))
app.use(express.static(path.join(__dirname, '/public')))
app.use(require('helmet')())

app.get('/', (req, res, next) => res.redirect('/global'))

app.get('/:country', async (req, res, next) => {
  const { country } = req.params
  let countries = (await api.countries({sort:'cases'}))
  let data = country.toLowerCase() === 'global' ? (await api.all()) : (await api.countries({country}))
  let yesterday = country.toLowerCase() !== 'global' ? await api.yesterday.countries({country}) : await api.yesterday.all()
  data.todayRecovered = data.recovered - yesterday.recovered
  data.todayActive = data.active - yesterday.active
  data.todayCritical = data.critical - yesterday.critical
  data.todayCasesPerOneMillion = data.casesPerOneMillion - yesterday.casesPerOneMillion
  data.todayDeathsPerOneMillion = data.deathsPerOneMillion - yesterday.deathsPerOneMillion
  data.todayTests = data.tests - yesterday.tests
  res.render('index', { countries, data })
})

app.use((err, req, res, next) => {
  console.error(new Date().toISOString(), err)
  res.locals.message = err.message
  res.locals.error = !isProduction ? err : {}
  res.status(err.status || 5e2).send({ error: err.message })
})

app.listen(process.env.HTTP_PORT, () => console.log(`listening on port ${process.env.HTTP_PORT}`))