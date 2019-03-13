const puppeteer = require('puppeteer')
const config = require('./config/config.json')

async function login(page) {
    return new Promise(async (resolve, reject) => {
        try {
            await page.goto('https://www.dndbeyond.com')
            await page.waitForSelector('#login-link')
            await page.click('#login-link')

            await page.waitForSelector('.twitch-button')
            await page.click('.twitch-button')
            await page.waitForSelector('#username')
            await page.waitForSelector('#password > input')
            await page.waitForSelector('#loginForm > div.buttons > button')

            await page.type('#username', config.user, { delay: 35 })
            await page.type('#password > input', config.password, { delay: 35 })
            await page.click('#loginForm > div.buttons > button')

            await page.waitForNavigation({ waitUntil: 'networkidle0' })
            await page.click('#kraken_auth > div > div > div.authorize_form > form > fieldset > button.button.button--large.js-authorize')
            await page.waitForNavigation({ waitUntil: 'networkidle0' })
            resolve()
        } catch (err) {
            reject()
            console.log('Error while logging in', err)
        }
    })
}

module.exports = login