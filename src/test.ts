import { V0, ID, AddressType } from './'
import { buffer2hex } from '@ctsy/buffer'
let v = new V0()
v.Data = Buffer.from('0a1f5c1b', 'hex');
v.WithTime = true;
v.From.Value = '0508'
v.To.Value = '0A08'
v.From.Type = AddressType.Phy
v.Confirm = true;
v.Encrypted = true;
// v.WithTime = false;
v.DataType = 5
let hex1 = buffer2hex(v.encode());
v.decode()

let hex2 = buffer2hex(v.encode());
console.log(hex1);
console.log(hex2);
console.log(hex1 == hex2);
// debugger