const puppeteer = require('puppeteer')
const fs = require('fs')
const { performance } = require('perf_hooks')
const statBlock = require('./config/statBlockSelectors.json')
const login = require('./login')
const parseMonsterAtUrl = async (page, url) => {
    return new Promise(async (resolve, reject) => {
        try {
            const t0 = performance.now()
            await page.goto(url, { waitUntil: 'networkidle0' })
            const monster = await parseMonster(page)
            const t1 = performance.now()
            console.log(`Parsing of monster: '${monster.header.name}' took ${(t1 - t0) / 1000} seconds.`)
            resolve(monster)
        } catch (err) {
            console.log('Error parsing monster at: ' + url)
            reject()
        }
    })
}

const parseMonster = async (page) => {
    return new Promise(async (resolve, reject) => {
        try {
            const monster = await page.evaluate(statBlock => {
                const scrape = {}
                scrape.header = {
                    name: document.querySelector(statBlock.header.name).innerText,
                    meta: document.querySelector(statBlock.header.meta).innerText
                }

                const attributes = Array.from(document.querySelectorAll(statBlock.attributes.selector))
                scrape.attributes = attributes.map(attribute => {
                    const label = attribute.querySelector(statBlock.attributes.data.label)
                    const value = attribute.querySelector(statBlock.attributes.data.value)
                    const extra = attribute.querySelector(statBlock.attributes.data.extra)
                    return {
                        label: label ? label.innerText : null,
                        value: value ? value.innerText : null,
                        extra: extra ? extra.innerText : null
                    }
                })

                const abilities = Array.from(document.querySelector(statBlock.abilities.selector).children)
                scrape.abilities = abilities.map(ability => {
                    const header = ability.querySelector(statBlock.abilities.data.header)
                    const score = ability.querySelector(statBlock.abilities.data.score)
                    const modifier = ability.querySelector(statBlock.abilities.data.modifier)
                    return {
                        header: header ? header.innerText : null,
                        score: score ? score.innerText : null,
                        modifier: modifier ? modifier.innerText : null
                    }
                })

                const tidbits = Array.from(document.querySelectorAll(statBlock.tidbits.selector))
                scrape.tidbits = tidbits.map(tidbit => {
                    let label = tidbit.querySelector(statBlock.tidbits.data.label)
                    label = label ? label.innerText : null
                    let data = tidbit.querySelector(statBlock.tidbits.data.data)
                    if (data) {
                        data = data.innerText.split(/[,;] /)
                        data = data.map(d => {
                            d = d.replace('and', '')
                            d = d.replace(' from Nonmagical Attacks', '')
                            return d
                        })
                        if (label === 'Challenge') data = data[0]
                    }
                    data = data || null
                    return {
                        label,
                        data
                    }
                })

                const descriptionBlocks = Array.from(document.querySelectorAll(statBlock.descriptionBlocks.selector))
                scrape.descriptionBlocks = descriptionBlocks.map(descriptionBlock => {
                    let header = descriptionBlock.querySelector(statBlock.descriptionBlocks.data.header)
                    header = header ? header.innerText : null
                    let content = descriptionBlock.querySelector(statBlock.descriptionBlocks.data.content)
                    content = Array.from(content.querySelectorAll('p'))
                    content = content.map(con => {
                        let title = con.querySelector('em > strong')
                        let description = con.innerText
                        if (title) {
                            title = title.innerText
                            description = description.replace(`${title} `, '')
                            if (title[title.length - 1] === '.') {
                                title = title.replace('.', '')
                            }
                        }
                        return {
                            title: title || null,
                            description
                        }
                    })

                    return {
                        header,
                        content
                    }
                })
                return scrape
            }, statBlock)
            resolve(monster)
        } catch (err) {
            console.log('Error parsing monster', err)
            reject()
        }
    })
}

const writeMonster = async (monster) => {
    if (!fs.existsSync('./monsters')) {
        fs.mkdirSync('./monsters')
    }
    fs.writeFileSync(`./monsters/${new Date().getTime()}.json`, JSON.stringify(monster))
}

async function main() {
    try {
        const browser = await puppeteer.launch({ headless: false })
        let page = await browser.newPage()
        await page.setViewport({ width: 1920, height: 1080 })

        let url = 'https://www.dndbeyond.com/monsters/adult-black-dragon'
        let monster = await parseMonsterAtUrl(page, url)
        writeMonster(monster)

        await login(page)
        url = 'https://www.dndbeyond.com/monsters/baba-lysaga'
        monster = await parseMonsterAtUrl(page, url)
        writeMonster(monster)

        url = 'https://www.dndbeyond.com/monsters/strahd-von-zarovich'
        monster = await parseMonsterAtUrl(page, url)
        writeMonster(monster)
    } catch (err) {
        console.log(err)
    }
}

main()