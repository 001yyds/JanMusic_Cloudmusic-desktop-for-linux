import crypto from 'node:crypto'

const PRESET_KEY = '0CoJUm6Qyw8W8jud'
const IV = '0102030405060708'
const PUBLIC_KEY = '010001'
const MODULUS =
  '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function aesEncrypt(text: string, key: string): string {
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(IV, 'utf8'))
  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64')
}

function rsaEncrypt(text: string): string {
  const n = Buffer.from(MODULUS, 'hex')
  const e = Buffer.from(PUBLIC_KEY, 'hex')
  const key = crypto.createPublicKey({
    key: { kty: 'RSA', n: n.toString('base64url'), e: e.toString('base64url') },
    format: 'jwk'
  })
  const keySize = Math.ceil((key.asymmetricKeyDetails?.modulusLength ?? 1024) / 8)
  const block = Buffer.alloc(keySize)
  Buffer.from(text.split('').reverse().join(''), 'utf8').copy(block, keySize - text.length)
  return crypto.publicEncrypt({ key, padding: crypto.constants.RSA_NO_PADDING }, block).toString('hex')
}

export function encodeWeapi(payload: unknown): string {
  let secret = ''
  for (let i = 0; i < 16; i += 1) secret += BASE62[crypto.randomInt(BASE62.length)]
  const params = aesEncrypt(aesEncrypt(JSON.stringify(payload), PRESET_KEY), secret)
  const encSecKey = rsaEncrypt(secret)
  return new URLSearchParams({ params, encSecKey }).toString()
}
