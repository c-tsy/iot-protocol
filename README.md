# IoT应用二进制通信协议设计及编解码库

## 协议设计描述文档

0x68 起始  
0x00 协议版本号 0-255  
3 字节厂商代码  
0000 0000 00控制码 1024个，0-100为系统定义的功能码，200-1023为应用码  
10 0000 高1位发送方地址类型，0逻辑地址，1物理地址  
01 0000 高2位接受方地址类型，0逻辑地址，1物理地址  
00 1000 高3位是否需要接受确认，0不需要，1需要  
00 0100 高4位数据是否加密，0不加密，1加密  
00 0010 高5位，带4字节时间戳，从2010年起计，秒级  
00 0001 高6位，是否有后续内容，0无1有

0000 0000 0数据帧序号 512个  
0 一个字节：0结束，1有后续分包  
00 0000 该该数据帧若分包，分包号 0-63，0表示不分包，1-63表示具体的分包序号，接收方需要接收到该控制码+序号的各个分包后组合好再使用  

4字节时间戳

2字节逻辑地址或4字节物理地址

1字节 数据协议类型

2字节数据区长度

n字节数据

1字节 校验位

示例：
68 00[协议版本号0] 00 01 01[厂商代码] 00 00[0000 0000 0000 0000  
控制码：0000 00 》 0，  
发送方地址：逻辑地址  
接收方地址：逻辑地址  
接收确认：不需要  
数据加密：不加密  
] 00 00[0000 0000 0000 0000  
帧序号：0000 0 》0  
结束帧：0 》 0 结束  
分包号：0 》 0 ] 01 0A[发送方逻辑地址] 05 08[接收方逻辑地址] 00[数据区数据协议：645?3761?....] 01 00[小端模式：00 01
数据区长度为1] 00[数据内容] 19[累加和校验位 从68后面开始计算到校验位前]  

68 01[协议版本号 1] 00 01 01[厂商代码] 00 78[0000 0000 0111 1000  
控制码二进制：00 0000 0001，控制码为1  
发送方地址：1,物理地址，后续4字节  
接收方地址：1，物理地址：后续4字节  
是否需要确认：需要  
是否加密：不加密] 78 56 34 12[4字节发送方物理地址] 98 76 54 32[4字节接收方物理地址] 00[数据区协议类型] 05 00[小端模式 数据区长度 00 05》5字节长度] 01 02 03 04 05[数据区：长度为5] 34[校验和]  

68 00 00 01 01 00 02[控制码：0000 0000 0000 0010  
控制码：0，逻辑地址，逻辑地址，无需确认，不加密，带时间戳] 01 00 00 00[换算：00 00 00 01，1秒  
实际时间：2010-01-01 00:00:01]  
加密算法：  
3字节 厂商代码，协议中携带 
3字节 厂商密码，出厂内置  
3字节 加密后秘钥 = 代码 xor 密码 xor [年后2位+月,日+时,精确到5分钟的分]  

如 代码：010101，密码：101010，时间：2019-09-28 12:21:00    
为保证数据被正确解密传输，可以算3个秘钥尝试解密，即每次加密15分钟有效  
0x010101 xor 0x101010 xor 0x284015 = 395104  
0x010101 xor 0x101010 xor 0x284020 =   
0x010101 xor 0x101010 xor 0x284025 =   
 
对数据区加密算法  
所有数据按每3个字节与秘钥进行xor运算，不足3字节部分按实际长度计算，  
或 将3字节的秘钥长度填充至数据区长度，做xor运算  
如 数据区 内容为 0x01890203  

## 帮助文档，其它语言可以参考这个定义来翻译
```typescript
/**
 * 帧序号缓存
 */
export declare var ID: number;
/**
 * 获取下一个ID
 */
export declare function get_next_id(): number;
/**
 * 错误类型
 */
export declare enum ErrorType {
    /**
     * 数据区太长
     */
    DATA_TOO_LARGE = "DataTooLarge",
    /**
     * CRC校验错误
     */
    CRC_ERROR = "CRCError",
    /**
     * 数据不足，该数据包未接受完成
     */
    NOT_ENOUGH = "NotEnough"
}
/**
 * 基础对象
 */
export declare class Base {
    /**
     * 版本号
     */
    Version: number;
    buf: Buffer;
    /**
     * 编码
     */
    encode(): Buffer;
    /**
     * CRC校验计算
     * @param buf
     */
    crc(pos?: number): number;
    /**
     * 解码
     */
    decode(): void;
}
/**
 * 地址类型
 */
export declare enum AddressType {
    /**
     * 逻辑地址，2字节
     */
    Logic = 0,
    /**
     * 物理地址，4字节
     */
    Phy = 1
}
/**
 * 地址对象
 */
export declare class Address {
    Type: AddressType;
    Value: string;
    constructor(Type?: AddressType, Value?: string);
}
/**
 * 0版本协议
 */
export declare class V0 extends Base {
    /**
     * 厂商代码
     */
    protected _CompanyID: string;
    /**
     * 厂商代码
     */
    CompanyID: string;
    /**
     * 控制码
     */
    Control: number;
    /**
     * 发送方地址
     */
    From: Address;
    /**
     * 接收方地址
     */
    To: Address;
    /**
     * 是否需要确认
     */
    Confirm: boolean;
    /**
     * 加密
     */
    Encrypted: boolean;
    /**
     * 是否携带4字节时间戳，从2010年起
     */
    WithTime: boolean;
    /**
     * 携带时间的情况下的时间值
     */
    Time: Date;
    /**
     * 帧序号
     */
    ID: number;
    /**
     * 第几帧
     */
    No: number;
    /**
     * 是否结束帧
     */
    End: boolean;
    DataType: number;
    Data: Buffer;
    encode(): Buffer;
    decode(): this;
}

```

## 使用实例

```typescript
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
console.log(hex1); // 68 00 00 00 00 00 2E 80 00 D3 72 63 12 00 00 08 05 08 0A 05 04 00 0A 1F 5C 1B 30
console.log(hex2); // 68 00 00 00 00 00 2E 80 00 D3 72 63 12 00 00 08 05 08 0A 05 04 00 0A 1F 5C 1B 30
console.log(hex1 == hex2); // true ，测试通过
// debugger
```