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
	for (var i=0;i<this.schema.length;i+=2) {
		var name = this.schema[i];
		var type = this.schema[i+1];
		//console.log(type);
		var arr = type.count > 1 ? "["+type.count+"]" : "";
		out.push("  "+type.name+" "+name+arr+"; // Size: "+type.size());
	}
	out.push("}; // Size: "+this.size());
	return out.join("\n")
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
			pos += type.bytes;	
		}
	});
}

struct.decoder = function(buffer, pos, opt) {
	var data = {}
	this.forEachInSchema((name,type)=> {
		if (type.count == 1) {
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
	return this.type("char",n,1)
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
struct.uint8 = function(n) {
	return this.type("uint8_t",1,n)
		.setEncoder(
			(buffer,pos,data,opt) => {
				buffer.writeUInt8(data || 0,pos);
			}
		)
		.setDecoder(
			(buffer,pos,opt) => {
				return buffer.readUInt8(pos);
			}
		)
};
struct.uint16 = function(n) {
	return this.type("uint16_t",2,n)
		.setEncoder(
			(buffer,pos,data,opt) => {
				//console.trace(opt)
				//console.log("uint16@ "+pos);
				if (opt && opt.endian == "LE")
					buffer.writeUInt16LE(data || 0,pos);
				else buffer.writeUInt16BE(data || 0,pos);
			}
		)
		.setDecoder(
			(buffer,pos,opt) => {
				if (opt && opt.endian == "LE")
					return buffer.readUInt16LE(pos);
				else return buffer.readUInt16BE(pos);
			}
		)
};
struct.uint32 = function(n) {
	return this.type("uint32_t",4,n)
		.setEncoder(
			(buffer,pos,data,opt) => {
				if (opt && opt.endian == "LE")
					buffer.writeUInt32LE(data || 0,pos);
				else buffer.writeUInt32BE(data || 0,pos);
			}
		)
		.setDecoder(
			(buffer,pos,opt) => {
				if (opt && opt.endian == "LE")
					return buffer.readUInt32LE(pos);
				else return buffer.readUInt32BE(pos);
			}
		)
};
