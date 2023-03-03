const hex = a => {
  const digits = '0123456789abcdef'
  let r = ''
  for (let i = 0; i < a.length; ++i) {
    r += digits[(a[i] >> 4) & 15] + digits[a[i] & 15]
  }
  return r
}
const cubehash = (() => {
  const rotate = (x, c) => (x << c) | (x >>> (32 - c))
  const swap = (x, a, b) => {
    let t = x[a]
    x[a] = x[b]
    x[b] = t
  }
  const st32 = (x, i, n) => {
    for (let j = 0; j < 4; ++j) {
      x[i + j] = n & 255
      n >>>= 8
    }
  }
  const round = (x) => {
    let i, t
    for (i = 0; i < 16; ++i) x[i + 16] = (x[i] + x[i + 16]) | 0
    for (i = 0; i < 16; ++i) x[i] = rotate(x[i], 7)
    for (i = 0; i < 8;  ++i) swap(x, i, i + 8)
    for (i = 0; i < 16; ++i) x[i] = x[i] ^ x[i + 16]
    for (i = 0; i < 4;  ++i) swap(x, 4 * i, 4 * i + 2)
    for (i = 0; i < 4;  ++i) swap(x, 4 * i + 1, 4 * i + 3)
    for (i = 0; i < 16; ++i) x[i + 16] = (x[i] + x[i + 16]) | 0
    for (i = 0; i < 16; ++i) x[i] = rotate(x[i], 11)
    for (i = 0; i < 4;  ++i) swap(x, i, i + 4)
    for (i = 0; i < 4;  ++i) swap(x, i + 8, i + 12)
    for (i = 0; i < 16; ++i) x[i] = x[i] ^ x[i + 16]
    for (i = 0; i < 8;  ++i) swap(x, 2 * i + 16, 2 * i + 17)
  }
  const cubehash = (m, initial_rounds, rounds, bytes, final_rounds, hash_size) => {
    let x = new Uint32Array(32)
    let h = new Uint8Array(hash_size)
    let i, j, l = m.length, p = 0
    x[0] = hash_size
    x[1] = bytes
    x[2] = rounds
    for (i = 0; i < initial_rounds; ++i) round(x)
    while (l >= 0) {
      for (i = 0; i < bytes; ++i) {
        x[(i / 4) | 0] ^= (i < l ? (m[p + i] & 255) : (i == l ? 128 : 0)) << ((i % 4) * 8)
      }
      for (i = 0; i < rounds; ++i) round(x)
      p += bytes
      l -= bytes
    }
    x[31] ^= 1
    for (i = 0; i < final_rounds; ++i) round(x)
    for (i = 0; i < hash_size / 4; ++i) st32(h, 4 * i, x[i])
    return h
  }
  return s => cubehash(new TextEncoder().encode(s), 16, 16, 32, 32, 32)
})()
const hashint = s => {
  let h = cubehash(s)
  let n = 0
  for (let i = 0; i < 4; ++i) n = n * 256 + h[i]
  return n
}
const randomNumber = (secret, number, range) => {
  let i = 0
  let max = range * Math.floor(4294967296 / range) - 1
  let n = hashint(secret + '#random#' + number + '#' + i)
  while (n > max) {
    i += 1
    n = hashint(secret + '#random#' + number + '#' + i)
  }
  return n % range
}
const randomSecret = () => hex(crypto.getRandomValues(new Uint8Array(16)))
const en = () => ({
  title: 'Secret Santa',
  participants: 'Participants',
  nickname: 'Nickname',
  email: 'Email',
  address: 'Address',
  remove: 'Remove',
  newParticipant: 'New Participant',
  nicknamesUnique: 'Must be unique!',
  secret: 'Secret',
  random: 'Random',
  subject: 'Subject',
  body: 'Body',
  introText: 'This secret value determines the assignment of the participants.',
  publicText: 'This text can be published in advance:',
  emailIntro: 'Here you can compose the email to the participants.',
  emailPlaceholders: 'You may use the placeholders #you, #them, #your_address and #their_address.',
  emailLinks: 'Here are the emails:'
})
const de = () => ({
  title: 'Wichteln',
  participants: 'Teilnehmer',
  nickname: 'Spitzname',
  email: 'E-Mail',
  address: 'Adresse',
  remove: 'Entfernen',
  newParticipant: 'Neuer Teilnehmer',
  nicknamesUnique: 'Darf nicht mehrfach vorkommen!',
  secret: 'Geheimnis',
  random: 'Zufällig',
  subject: 'Betreff',
  body: 'Text',
  introText: 'Dieser geheime Wert bestimmt die Zuordnung der Wichtel.',
  publicText: 'Dieser Text kann vorab veröffentlicht werden:',
  emailIntro: 'Hier kann die E-Mail an die Wichtel verfasst werden.',
  emailPlaceholders: 'Im Text können die Platzhalter #du, #sie, #deine_adresse und #ihre_adresse verwendet werden.',
  emailLinks: 'Hier sind nun die E-Mails:'
})
const defaultData = () => ({
  secret: randomSecret(),
  participants: [],
  email: {
    subject: '',
    body: ''
  }
})
const template = (s, o) => s.replace(/#([a-z_]+)/g, (m, n) => o[n] || m)
const indent = (s, i) => s.replace(/^/gm, i)
const urlencode = s => {
  const hexdigits = '0123456789ABCDEF'
  let bytes = new TextEncoder().encode(s)
  let r = ''
  for (let i = 0; i < bytes.length; ++i) {
    let b = bytes[i]
    r += '%' + hexdigits[(b >> 4) & 15] + hexdigits[b & 15]
  }
  return r
}
const mailtoLink = (to, subject, body) => {
  return 'mailto:' + urlencode(to) + '?subject=' + urlencode(subject) + '&body=' + urlencode(body)
}
const isObject = o => typeof o === 'object' && o !== null
const load = data => {
  try {
    data = JSON.parse(data)
  } catch (e) {
    return defaultData()
  }
  if (!isObject(data)) return defaultData()
  if (typeof data.secret !== 'string') return defaultData()
  let participants = []
  if (!Array.isArray(data.participants)) return defaultData()
  for (let i = 0; i < data.participants.length; ++i) {
    let p = data.participants[i]
    if (!isObject(p) ||
        typeof p.nickname !== 'string' ||
        typeof p.email !== 'string' ||
        typeof p.address !== 'string') {
      return defaultData()
    }
    participants.push({
      nickname: p.nickname,
      email: p.email,
      address: p.address
    })
  }
  let email = {
    subject: '',
    body: ''
  }
  if (isObject(data.email)) {
    if (typeof data.email.subject === 'string') {
      email.subject = data.email.subject
    }
    if (typeof data.email.body === 'string') {
      email.body = data.email.body
    }
  }
  return {
    secret: data.secret,
    email: email,
    participants: participants
  }
}
const save = data => {
  return JSON.stringify(data)
}
const loadLocale = l => {
  if (l === 'en') {
    return en()
  } else if (l === 'de') {
    return de()
  } else {
    let langs = navigator.languages || [navigator.language]
    for (let i = 0; i < langs.length; ++i) {
      if (langs[i].startsWith('en')) {
        return en()
      } else if (langs[i].startsWith('de')) {
        return de()
      }
    }
    return en()
  }
}
const app = Vue.createApp({
  data() {
    return {
      data: load(localStorage.getItem('wichteln-data')),
      locale: loadLocale(localStorage.getItem('wichteln-lang'))
    }
  },
  mounted() {
    document.title = this.locale.title
    document.querySelector('body').classList.remove('loading')
    window.addEventListener('storage', e => {
      if (e.key === 'wichteln-data') {
        this.data = load(e.newValue)
      } else if (e.key === 'wichteln-lang') {
        this.locale = loadLocale(e.newValue)
      }
    })
  },
  computed: {
    nicknameErrors() {
      let errors = []
      let nicknames = {}
      for (let i = 0; i < this.data.participants.length; ++i) {
        let p = this.data.participants[i]
        errors[i] = nicknames[p.nickname] === true ? true : false
        nicknames[p.nickname] = true
      }
      return errors
    },
    public() {
      return hex(cubehash(this.data.secret + '#public'))
    },
    mails() {
      let mails = []
      let names = []
      for (let i = 0; i < this.data.participants.length; ++i) {
        let p = this.data.participants[i]
        if (p.nickname !== '') {
          names.push({
            hash: hex(cubehash(this.data.secret + '#nickname#' + p.nickname)),
            index: i
          })
        }
      }
      names.sort((a, b) => {
        if (a.hash < b.hash) {
          return -1
        }
        if (a.hash > b.hash) {
          return 1
        }
        return 0
      })
      let n = names.length
      let draw = []
      for (let i = 0; i < n; ++i) {
        draw[i] = names.splice(randomNumber(this.secret, i, names.length), 1)[0]
      }
      for (let i = 0; i < n; ++i) {
        let you = this.data.participants[draw[i].index]
        let them = this.data.participants[draw[(i + 1) % n].index]
        mails[i] = {
          nickname: you.nickname,
          mail: mailtoLink(you.email, this.data.email.subject, template(this.data.email.body, {
            du: you.nickname,
            sie: them.nickname,
            deine_adresse: indent(you.address, '  '),
            ihre_adresse: indent(them.address, '  '),
            you: you.nickname,
            them: them.nickname,
            your_address: indent(you.address, '  '),
            their_address: indent(them.address, '  ')
          }))
        }
      }
      return mails
    }
  },
  watch: {
    data: {
      handler() {
        localStorage.setItem('wichteln-data', save(this.data))
      },
      deep: true
    },
    'locale.title': {
      handler() {
        document.title = this.locale.title
      }
    }
  },
  methods: {
    removeParticipant(i) {
      this.data.participants.splice(i, 1)
    },
    addParticipant() {
      this.data.participants.push({
        nickname: '',
        email: '',
        address: ''
      })
    },
    selectLanguage(lang) {
      localStorage.setItem('wichteln-lang', lang)
      if (lang === 'de') {
        this.locale = de()
      } else {
        this.locale = en()
      }
    },
    randomSecret() {
      this.data.secret = randomSecret()
    }
  }
})
.component('text-field', {
  props: ['label', 'modelValue', 'error'],
  template: '<div class="input" :class="{error: hasError}"><label>{{label}}{{errorText}}</label><input type="text" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"/></div>',
  computed: {
    hasError() {
      return typeof this.error === 'string'
    },
    errorText() {
      return (typeof this.error === 'string' && this.error !== '') ? (' - ' + this.error) : ''
    }
  }
})
.component('text-area', {
  props: ['label', 'modelValue'],
  template: '<div class="input"><label>{{label}}</label><textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea><div class="sizer" v-html="htmlValue"></div></div>',
  computed: {
    htmlValue() {
      return this.modelValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/^$/, '&nbsp;')
        .replace(/\n$/, '<br/>&nbsp;')
        .replace(/\n/g, '<br/>')
    }
  }
})
.mount('#app')
;(() => {
  const sun = 'm8 5a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3zm0-3v-1m4.24 2.76.71-.71m1.05 4.95h1m-2.76 4.24.71.71m-4.95 1.05v1m-4.24-2.76-.71.71m-1.05-4.95h-1m2.76-4.24-.71-.71'
  const moon = 'm12 1a7.83 7.83 0 1 1-11 11a13 13 0 0 0 11-11z'
  const html = document.querySelector('html')
  const div = document.createElement('div')
  div.setAttribute('class', 'dark-mode-switch')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentcolor')
  path.setAttribute('stroke-width', '2')
  path.setAttribute('stroke-linejoin', 'round')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('d', sun)
  svg.appendChild(path)
  div.appendChild(svg)
  let colorScheme = localStorage.getItem('color-scheme')
  let prefersDark = false
  const update = () => {
    html.classList.remove('dark')
    html.classList.remove('light')
    if (colorScheme === 'dark') {
      html.classList.add('dark')
      path.setAttribute('d', sun)
    } else if (colorScheme === 'light') {
      html.classList.add('light')
      path.setAttribute('d', moon)
    } else {
      path.setAttribute('d', prefersDark ? sun : moon)
    }
  }
  svg.addEventListener('click', e => {
    e.preventDefault()
    if (colorScheme === 'dark' || colorScheme === 'light') {
      localStorage.removeItem('color-scheme')
      colorScheme = null
    } else {
      colorScheme = prefersDark ? 'light' : 'dark'
      localStorage.setItem('color-scheme', colorScheme)
    }
    update()
  })
  if (window.matchMedia) {
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    prefersDark = dark.matches
    dark.addEventListener('change', e => {
      prefersDark = e.matches
      update()
    })
  }
  window.addEventListener('storage', e => {
    if (e.key === 'color-scheme') {
      colorScheme = e.newValue
      update()
    }
  })
  update()
  document.querySelector('body').appendChild(div)
})()
