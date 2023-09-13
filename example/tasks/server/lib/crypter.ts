// import { hash as bcryptHash, compare as bcryptCompare } from 'bcrypt'

//const saltRounds = 10
export const hash =  (_password: string) => { throw new Error('Unimplemented') }//await bcryptHash(password, saltRounds)
export const compare = (_password: string, _hashedPassword: string) => {throw new Error('Unimplemented')}//bcryptCompare(password, hashedPassword)
