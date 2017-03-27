module.exports = struct;

// struct class
function struct(name, schema, count, bytes) {
	this.name = name;
	this.schema = schema;
	this.bytes = bytes || 0;
	for (var i=1;i<schema.length;i+=2) {
		this.bytes += schema[i].size();
	}
	this.count = count || 1;
	this.encoder = struct.encoder;
	this.decoder = struct.decoder;
}

// instance members
struct.prototype.setEncoder = function(f) {
	return this.encoder = f, this;
}

struct.prototype.setDecoder = function(f) {
	return this.decoder = f, this;
}

struct.prototype.setIsNoArray = function(noArray) {
	return this.isNoArray = noArray, this;
}

struct.prototype.forEachInSchema = function (f) {
	for (var i=0;i<this.schema.length;i+=2) {
		var name = this.schema[i];
		var type = this.schema[i+1];
		f(name,type);
	}
}

struct.prototype.size = function() {
	return this.bytes * this.count;
};

struct.prototype.toString = function() {
	var out = ["struct "+this.name+" {"]
	this.forEachInSchema((name,type)=>{	
		var arr = type.count > 1 ? "["+type.count+"]" : "";
		out.push("  "+type.name+" "+name+arr+"; // Size: "+type.size());
	});
	out.push("}; // Size: "+this.size());
	return out.join("\n");
};

struct.prototype.encode = function(buffer,pos, data, opt) {
	this.encoder(buffer,pos||0,data, opt);
};

struct.prototype.decode = function(buffer,pos,opt) {
	return this.decoder(buffer,pos||0,opt);
};

// class members
struct.encoder = function(buffer, pos, data, opt) {
	this.forEachInSchema((name,type)=> {
		var dval = data && data[name]
		//console.log(pos,this.name+"."+name,type.name,type.size(),type.schema);
		for (var j=0;j<type.count;j+=1) {
			var el = dval && dval.join ? dval[j] : dval;
			type.encode(buffer,pos,el,opt);
			if (type.isNoArray) {
				pos += type.size();
				break;
			} else {
				pos += type.bytes;	
			}
		}
	});
}

struct.decoder = function(buffer, pos, opt) {
	var data = {}
	this.forEachInSchema((name,type)=> {
		if (type.count == 1 || type.isNoArray) {
			data[name] = type.decode(buffer,pos,opt);
			pos += type.size();
		} else {
			var arr = [];
			data[name] = arr;
			for (var i=0;i<type.count;i+=1) {
				arr[i] = type.decode(buffer,pos,opt);
				//console.log(pos,arr[i],type)
				pos += type.bytes;
			}
		}
	});
	return data;
}

struct.type = function(type,size,count) {
	return new struct(type.name || type, [], count, size)
		.setEncoder(
			(buffer,pos,data,opt)=>{
				type.encode(buffer,pos,data,opt)
			}
		)
		.setDecoder(
			(buffer,pos,data,opt)=>{
				return type.decode(buffer,pos,opt);
			}
		)
}
struct.char = function(n) {
	return this.type("char",1,n)
		.setIsNoArray(true)
		.setEncoder(
			(buffer,pos,data,opt) => {
				var str = data ? data.toString() : "";
				for (var i=0;i<n;i+=1) {
					buffer.write(i < str.length ? str[i] : "\0",pos+i)
				}
			}
		)
		.setDecoder(
			(buffer,pos,opt) => {
				var s = buffer.toString("ASCII",pos,pos+n);
				var cutAt = s.indexOf("\0");
				if (cutAt < 0) return s;
				return s.substr(0,cutAt);
			}
		)
};
function addNumberType(jsName,bytes,alias,aliasCPP) {
	var writeName = "write"+jsName;
	var readName = "read"+jsName;
	var writeAccess = [
		bytes > 1 ? writeName + "BE" : writeName,
		bytes > 1 ? writeName + "LE" : writeName
	];
	var readAccess = [
		bytes > 1 ? readName + "BE" : readName,
		bytes > 1 ? readName + "LE" : readName
	];

	if (!alias) alias = jsName.toLowerCase();
	struct[alias] = function(n) {
		return this.type(aliasCPP||(jsName.toLowerCase()+"_t"),bytes,n)
			.setEncoder(
				(buffer,pos,data,opt) => {
					buffer[writeAccess[isLittleEndian(opt)]](data||0,pos);
				}
			)
			.setDecoder(
				(buffer,pos,opt) => {
					return buffer[readAccess[isLittleEndian(opt)]](pos);
				}
			)
	}
}

addNumberType("UInt8",1);
addNumberType("UInt16",2);
addNumberType("UInt32",4);
addNumberType("Int8",1);
addNumberType("Int16",2);
addNumberType("Int32",4);
addNumberType("Float",4,"float32","float");
addNumberType("Double",8,"double64","double");

function isLittleEndian(opt) {
	return opt && opt.endian == "LE" ? 1 : 0;
}