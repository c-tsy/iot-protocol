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



// 1：阀门主动上报数据
// a：阀门号（4字节），区域号（？字节），IMEI（字符串 15个字节）,CSQ（0-31 1字节），ECL（1字节） ，RSRP（2字节），SNR2字节  ，RSSI2字节
// b：阀门开启时间（时间戳），阀门关闭时间（时间戳），阀门当前时间（时间戳），阀门当前开启度（0-100%），电池电压（例：3.2V），进水温度（例：67.34℃），回水温度
// c：累计运行时间（分钟，本参数预留，可选）
// d：状态字（16bit），bit0:阀门状态 0 正常 1异常  bit1：阀门锁定状态  0 正常  1 锁定 
//     bit2：开盖报警 0 正常  1异常  bit3：进水温度传感器 0 正常 1异常  bit4：

// 2：下发开关阀门命令（不在区分开关命令，只下发开启度，如下发0°则是关闭，如100%则是完全开启）
// a：阀门号，区域号（？字节），
// b：阀门开启时间（时间戳），开启度（0-100%），阀门关闭时间（时间戳）
// c：锁定标志  0非锁定   1锁定  锁定后 射频卡不能再用

// 3：设置网络上报参数 
// a：上报启动时间  年月日时分  千万别改为时间戳  我程序还要处理 麻烦 
// b：上报周期   5---65535分钟 
// c：随机间隔  0-65535  ， 随机时隙 0--255

// 4：设置，温度系数，电机堵转电流参数
// a：堵转电流 （ 0---4095 ma ）
// d：入口温度系数1（0---65535），入口温度系数2（0---65535），入口温度系数3（0---65535），
// e：出口温度系数1（0---65535），出口温度系数2（0---65535），出口温度系数3（0---65535），


// 5：下发网络地址参数 设置IP地址，
// a：IP地址，端口号：均字符串下发


// 6：读取阀门参数 
// a：如上 