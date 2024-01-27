import { Writable } from 'node:stream'
import express from 'express'

export const apply = async (srcRes: Response, dstRes: express.Response) => {
  srcRes.headers.forEach((value, key) => {
    dstRes.setHeader(key, value)
  })

  dstRes.status(srcRes.status)
  if (srcRes.url) {
    dstRes.redirect(srcRes.url)
    return
  }

  if (srcRes.body) {
    await srcRes.body.pipeTo(Writable.toWeb(dstRes))
  } else {
    dstRes.end()
  }
}
