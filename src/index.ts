import { Buffer } from 'buffer';
import * as moment from 'moment';
import { buffer2hex } from '@ctsy/buffer';

export enum ParseMap {
    Version = '版本号',
    CompanyID = '厂商代码',
    Control = '控制码',
    From = '发送方地址',
    To = '接收方地址',
    Confirm = '需要确认?',
    Encrypted = '需要加密?',
    WithTime = '带时间?',
    Time = '时间',
    ID = '帧序号',
    No = '第几帧',
    End = '结束帧?',
    DataType = '数据类型',
    Data = '数据内容'
}
/**
 * 帧序号缓存
 */
export var ID: number = 0;
/**
 * 获取下一个ID
 */
export function get_next_id(): number {
    // return 1;
    if (ID >= 511) {
        return ID = 0;
    }
    return ++ID;
}
/**
 * 错误类型
 */
export enum ErrorType {
    /**
     * 数据区太长
     */
    DATA_TOO_LARGE = 'DataTooLarge',
    /**
     * CRC校验错误
     */
    CRC_ERROR = 'CRCError',
    /**
     * 数据不足，该数据包未接受完成
     */
    NOT_ENOUGH = 'NotEnough',
}
/**
 * 基础对象
 */
export class Base {
    /**
     * 版本号
     */
    Version: number = 0;

    buf: Buffer = Buffer.from('680000', 'hex')
    /**
     * 编码
     */
    encode(): Buffer {
        return this.buf;
    }
    /**
     * CRC校验计算
     * @param buf 
     */
    crc(pos = -1) {
        if (this.buf.length == 0) { return 0; }
        if (pos == -1) { pos = this.buf.length - 1; }
        this.buf[pos] = 0;
        for (let i = 1; i < this.buf.length - 1; i++) {
            this.buf[pos] += this.buf[i];
            // this.buf[pos] = this.buf[pos] % 256;
        }
        return this.buf[pos];
    }
    /**
     * 解码
     */
    decode() {
        //用于移除多余的前导码或错误数据
        let startIndex = this.buf.indexOf(0x68);
        if (startIndex > 0) { this.buf = this.buf.slice(startIndex); }
        this.Version = this.buf[1];
    }
}
/**
 * 地址类型
 */
export enum AddressType {
    /**
     * 逻辑地址，2字节
     */
    Logic,
    /**
     * 物理地址，4字节
     */
    Phy
}
/**
 * 地址对象
 */
export class Address {
    Type: AddressType;
    Value: string;
    constructor(Type: AddressType = AddressType.Logic, Value: string = '00') {
        this.Type = Type;
        this.Value = Value;
    }
}
/**
 * 0版本协议
 */
export class V0 extends Base {
    /**
     * 厂商代码
     */
    protected _CompanyID: string = '000000';
    /**
     * 厂商代码
     */
    get CompanyID() { return this._CompanyID; }
    set CompanyID(CompanyID: string) {
        this._CompanyID = CompanyID.padEnd(6, '0')
    }
    /**
     * 控制码
     */
    Control: number = 0;
    /**
     * 发送方地址
     */
    From: Address = new Address(AddressType.Logic);
    /**
     * 接收方地址
     */
    To: Address = new Address(AddressType.Logic);
    /**
     * 是否需要确认
     */
    Confirm: boolean = false;
    /**
     * 加密
     */
    Encrypted: boolean = false;
    /**
     * 是否携带4字节时间戳，从2010年起
     */
    WithTime: boolean = false;
    /**
     * 携带时间的情况下的时间值
     */
    Time: Date = new Date

    /**
     * 帧序号
     */
    ID: number = 0;
    /**
     * 第几帧
     */
    No: number = 0

    /**
     * 是否结束帧
     */
    End: boolean = true;

    DataType: number = 0;
    Data: Buffer = Buffer.alloc(0);
    explain: string[] = [];
    encode(explain: boolean = false): Buffer {
        let buf = [
            Buffer.from('68', 'hex'),
            Buffer.alloc(1, this.Version),
            Buffer.from(this.CompanyID, 'hex'),
            Buffer.alloc(4)
        ];
        //左移6位
        buf[3].writeInt16LE(this.Control << 6, 0);
        //写入时间数据，携带数据或者加密模式都需要，协议包头包尾不加密
        if (this.WithTime || this.Encrypted) {
            buf[3][1] |= 2;
            let b = Buffer.alloc(4)
            let t = moment(this.Time).add(-14610, 'days').toDate().getTime() / 1000;
            console.log(t)
            b.writeInt32LE(t, 0)
            buf.push(b)
        }
        if (this.Encrypted) {
            buf[3][1] |= 4;
        }
        if (this.Confirm) {
            buf[3][1] |= 8;
        }
        //开始写入地址数据
        if (this.From.Type == AddressType.Phy) {
            buf[3][1] |= 32;
            buf.push(Buffer.from(this.From.Value.padEnd(8, '0'), 'hex').reverse())
        } else {
            buf.push(Buffer.from(this.From.Value.padEnd(4, '0'), 'hex').reverse())
        }
        if (this.To.Type == AddressType.Phy) {
            buf[3][1] |= 16;
            buf.push(Buffer.from(this.To.Value.padEnd(8, '0'), 'hex').reverse())
        } else {
            buf.push(Buffer.from(this.To.Value.padEnd(4, '0'), 'hex').reverse())
        }
        //完成地址数据的生成
        //写入帧序号
        buf[3].writeUInt16LE(get_next_id() << 7, 2)
        buf.push(Buffer.alloc(1, this.DataType));
        //开始写入数据
        if (this.Data.length > 65535) {
            throw new Error(ErrorType.DATA_TOO_LARGE)
            //开始分帧
            let split = [];
            let b = Buffer.alloc(2)
            b.writeInt16LE(65535, 0);
            buf.push(b)
            let k = buf.length;
            buf.push(Buffer.alloc(0));
            //写入crc预留位
            buf.push(Buffer.alloc(1));
            for (let i = 0; i < this.Data.length; i += 65535) {
                buf[k] = this.Data.slice(i, i + 65535);
                this.buf = Buffer.concat(buf);
                this.crc;
                split.push(this.buf);
            }
        } else {
            let b = Buffer.alloc(2)
            b.writeInt16LE(this.Data.length, 0);
            buf.push(b)
            buf.push(this.Data);
        }
        buf.push(Buffer.alloc(1))
        this.buf = Buffer.concat(buf);
        this.crc()
        return this.buf;
    }

    decode() {
        super.decode();
        //读出厂商代码
        explain_text(this.buf, 0, 1, '起始位置', 'Start', '0x68')
        explain_text(this.buf, 1, 1, '版本号', 'Version', this.Version);
        let i = 2;
        this._CompanyID = this.buf.slice(i, i += 3).toString('hex');
        explain_text(this.buf, i - 3, 3, '厂商代码', 'CompanyID', this._CompanyID);
        this.Control = this.buf.readUInt16LE(i) >> 6;
        explain_text(this.buf, i, 2, '控制码(2位,编码左移,解码右移) >> 6', 'Control', this.Control);
        let t = i + 4;
        i++;
        if (this.buf[i] & 2) {
            this.WithTime = true;
            console.log(this.buf.readUInt32LE(t))
            this.Time = moment(this.buf.readUInt32LE(t) * 1000).add(14610, 'days').toDate();
            explain_text(this.buf, t, 4, '时间内容', 'Time', moment(this.Time).format('YYYY-MM-DD HH:mm:zz'));
            t += 4;
        }
        explain_text(this.buf, i, 1, '是否带时间[第2位],1带0不带(带的情况下需要取后面的4字节时间)', 'WithTime', this.WithTime);
        if (this.buf[i] & 4) {
            this.Encrypted = true;
        }
        explain_text(this.buf, i, 1, '是否加密[第3位],1加密0不加密', 'Encrypted', this.Encrypted);
        if (this.buf[i] & 8) {
            this.Confirm = true;
        }
        explain_text(this.buf, i, 1, '是否加密[第4位],1需要确认0不需确认', 'Confirm', this.Confirm);
        explain_text(this.buf, i, 1, '接收方地址类型[第5位],1物理0逻辑', 'To.Type', '4字节为物理地址2字节为逻辑地址');
        explain_text(this.buf, i, 1, '接收方地址类型[第6位],1物理0逻辑', 'From.Type', '4字节为物理地址2字节为逻辑地址');
        if (this.buf[i] & 32) {
            this.From.Type = AddressType.Phy;
            this.From.Value = Buffer.from(this.buf.slice(t, t += 4)).reverse().toString('hex')
            explain_text(this.buf, t - 4, 4, '发送方地址', 'From.Value', this.From.Value);
        } else {
            this.From.Type = AddressType.Logic;
            this.From.Value = Buffer.from(this.buf.slice(t, t += 2)).reverse().toString('hex')
            explain_text(this.buf, t - 2, 2, '发送方地址', 'From.Value', this.From.Value);
        }
        if (this.buf[i] & 16) {
            this.To.Type = AddressType.Phy;
            this.To.Value = Buffer.from(this.buf.slice(t, t += 4)).reverse().toString('hex')
            explain_text(this.buf, t - 4, 4, '接收方地址', 'To.Value', this.To.Value);
        } else {
            this.To.Type = AddressType.Logic;
            this.To.Value = Buffer.from(this.buf.slice(t, t += 2)).reverse().toString('hex')
            explain_text(this.buf, t - 2, 2, '接收方地址', 'To.Value', this.To.Value);
        }
        i++;
        //帧序号和帧内顺序
        this.ID = this.buf.readUInt16LE(i++) >> 7;
        explain_text(this.buf, i - 1, 2, '帧序号 解码>>7,编码<<7', 'ID', this.ID);
        if (this.buf[i] & 64) {
            this.End = false;
        }
        explain_text(this.buf, i, 1, '是否结束[第7位],1未结束0结束', 'End', this.End);
        this.No = this.buf[i++] & 63;
        explain_text(this.buf, i - 1, 1, '包内第几帧[低6位]', 'No', this.No);
        i = t;
        /**
         * 数据区协议
         */
        this.DataType = this.buf[i++];
        explain_text(this.buf, i - 1, 1, '数据区协议类型', 'DataType', this.DataType);
        let len = this.buf.readUInt16LE(i);
        explain_text(this.buf, i, 2, '数据区长度', 'DataLen', len);
        i += 2;
        if (this.buf.length < i + len) {
            throw new Error(ErrorType.NOT_ENOUGH);
        }
        let crc = this.buf[i + len];
        if (this.crc() != crc) {
            throw new Error(ErrorType.CRC_ERROR);
        }
        this.Data = this.buf.slice(i, i + len);
        explain_text(this.buf, i, 2, '数据区内容', 'Data', buffer2hex(this.Data));
        return this;
    }
}
/**
 * 
 */
export enum ItemType {
    /**
     * 原始字符串
     */
    AsciiString,
    /**
     * Hex字符串
     */
    HexString,


}
/**
 * 
 */
export class Item {
    Type: string = ''
}


// /**
//  * 
//  * @param data 
//  */
// export function parse(data: V0) {
//     let t: string[] = [];
//     for (let x in data) {
//         if (ParseMap[x]) {
//             if ('string' == data[x] || 'number' == data[x]) {
//                 t.push(`${ParseMap[x]}: ${data[x]}`)
//             }
//         }
//     }
//     return t.join('\r\n')
// }


export function explain_text(buf: Buffer, offset: number, len: number, name: string, code: string, value: any) {
    return `[${offset} - ${offset + len - 1}] ${name}(${code}) : ${buffer2hex(buf.slice(offset, offset + len))} => ${value}`
}