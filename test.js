var struct = require("./cpp-struct.js");

/// tests
var tests = [
	function uint8() {
		var uint8 = new struct("int8",[
			"int8", struct.uint8()
		]);
		
		assertEQ(1,uint8.size());
		var buff = Buffer.alloc(3);

		uint8.encode(buff,1,{int8:32});
		assertEQ("\0 \0",buff.toString("ASCII"));

		var result = uint8.decode(buff,1);
		assertEQ(32, result && result.int8);
	},
	function uint16() {
		var uint16 = new struct("uint16",[
			"uint16", struct.uint16()
		]);

		assertEQ(2,uint16.size());
		var buff = new Buffer.alloc(4);

		uint16.encode(buff,1,{uint16:0x0120});
		assertEQ("\0\1 \0",buff.toString("ASCII"));

		uint16.encode(buff,1,{uint16:0x0120},{endian:"LE"});
		assertEQ("\0 \1\0",buff.toString("ASCII"));

		var result = uint16.decode(buff,1,{endian:"LE"})
		assertEQ(0x0120, result && result.uint16);

		result = uint16.decode(buff,1,{endian:"BE"})
		assertEQ(0x2001, result && result.uint16);

		result = uint16.decode(buff,1)
		assertEQ(0x2001, result && result.uint16);
	},
	function uint32() {
		var uint32 = new struct("uint32",[
			"uint32", struct.uint32()
		]);

		assertEQ(4,uint32.size());
		var buff = new Buffer.alloc(6);

		uint32.encode(buff,1,{uint32:0x01020304});
		assertEQ("\0\1\2\3\4\0",buff.toString("ASCII"));

		uint32.encode(buff,1,{uint32:0x01020304},{endian:"LE"});
		assertEQ("\0\4\3\2\1\0",buff.toString("ASCII"));

		var result = uint32.decode(buff,1,{endian:"LE"})
		assertEQ(0x01020304, result && result.uint32);
	
		result = uint32.decode(buff,1,{endian:"BE"})
		assertEQ(0x04030201, result && result.uint32);
		
		result = uint32.decode(buff,1)
		assertEQ(0x04030201, result && result.uint32);
	},
	function FixedStringStruct () {
		var FixedStringStruct = new struct("FixedStringStruct", [
			"name", struct.char(5),
		]);

		assertEQ(5,FixedStringStruct.size())
		var buff = Buffer.alloc(FixedStringStruct.size(),0);
		var result
		
		FixedStringStruct.encode(buff,0);
		assertEQ("\0\0\0\0\0",buff.toString("ASCII"));

		result = FixedStringStruct.decode(buff,0);
		assertEQ("",result && result.name);
		
		FixedStringStruct.encode(buff,0,{"name":"hi"});
		assertEQ("hi\0\0\0",buff.toString("ASCII"));
		
		result = FixedStringStruct.decode(buff,0);
		assertEQ("hi",result && result.name);

		FixedStringStruct.encode(buff,0,{"name":"this is too long"});
		assertEQ("this ",buff.toString("ASCII"));

		buff = Buffer.alloc(FixedStringStruct.size() + 2,0);
		FixedStringStruct.encode(buff,1,{"name":"this is too long"});
		assertEQ("\0this \0",buff.toString("ASCII"));

		result = FixedStringStruct.decode(buff,1);
		assertEQ("this ",result && result.name);
	},
	function Nesting() {
		var Player = new struct("Player", [
			"name", struct.char(2),
			"info", struct.uint8(2)
		]);
		assertEQ(4,Player.size());
		var Collection = new struct("Collection", [
			"gameName", struct.char(4),
			"players", struct.type(Player,Player.size(),3)
		]);
		assertEQ(16,Collection.size());
		var buff = Buffer.alloc(16);
		Collection.encode(buff,0,{gameName:"hey",players:[
				{name:"hi",info:[1,2]}
			]});
		assertEQ("hey\0hi\1\2\0\0\0\0\0\0\0\0",buff.toString("ASCII"));

		var result = Collection.decode(buff);
		assertEQ(JSON.stringify({
			gameName:"hey",
			players:[
				{name:"hi",info:[1,2]},
				{name:"",info:[0,0]},
				{name:"",info:[0,0]}
			]
		}), JSON.stringify(result))
	}
]

/// boilerplate
var err = 0, asserts = 0
for (var i=0;i<tests.length;i+=1) {
	try {
		tests[i]();
	} catch(e) {
		err += 1;
		console.error("Test "+tests[i].name+" failed:")
		var arr = e.stack.split("\n");
		console.log(arr.splice(0,arr.length-8).join("\n"));
	}
}

function assertEQ(exp,has) {
	if (exp !== has) {
		throw new Error("Expected: "+
			exp+(exp && exp.length?"["+exp.length+"]":"")+" got "+
			has+(has && has.length?"["+has.length+"]":""))
	}
	asserts+=1;
}

function assert(cond,msg) {
	if (!cond) throw new Error(msg);
	asserts+=1;
}
console.log("  "+tests.length+" test(s), "+
	err+" error(s), "+asserts+" passed assert(s)");
process.exit(err)