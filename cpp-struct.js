module.exports = struct;

function struct(name, schema, count, bytes) {
	this.name = name;
	this.schema = schema;
	this.bytes = bytes || 0;
	for (var i=1;i<schema.length;i+=2) {
		this.bytes += schema[i].size();
	}
	this.count = count || 1;
	this.encoder = struct.encoder;
}

struct.prototype.setEncoder = function(f) {
	this.encoder = f;
	return this;
}

struct.encoder = function(buffer, pos, data, opt) {
	for (var i=0;i<this.schema.length;i+=2) {
		var name = this.schema[i];
		var type = this.schema[i+1];
		var dval = data && data[name]
		//console.log(pos,this.name+"."+name,type.name,type.size(),type.schema);
		for (var j=0;j<type.count;j+=1) {
			var el = dval && dval.join ? dval[j] : dval;
			type.encode(buffer,pos,el,opt);
			pos += type.bytes;	
		}
		
	}
}

struct.type = function(type,size,count) {
	return new struct(type.name || type, [], count, size).setEncoder(
		(buffer,pos,data,opt)=>{
			type.encode(buffer,pos,data,opt)
		});
}
struct.char = function(n) {
	return this.type("char",n,1).setEncoder(
		(buffer,pos,data,opt) => {
			var str = data ? data.toString() : "";
			for (var i=0;i<n;i+=1) {
				buffer.write(i < str.length ? str[i] : "\0",pos+i)
			}
		});
};
struct.uint8 = function(n) {
	return this.type("uint8_t",1,n).setEncoder(
		(buffer,pos,data,opt) => {
			buffer.writeUInt8(data || 0,pos);
		});
};
struct.uint16 = function(n) {
	return this.type("uint16_t",2,n).setEncoder(
		(buffer,pos,data,opt) => {
			//console.trace(opt)
			//console.log("uint16@ "+pos);
			if (opt && opt.endian == "LE")
				buffer.writeUInt16LE(data || 0,pos);
			else buffer.writeUInt16BE(data || 0,pos);
		});
};
struct.uint32 = function(n) {
	return this.type("uint32_t",4,n).setEncoder(
		(buffer,pos,data,opt) => {
			if (opt && opt.endian == "LE")
				buffer.writeUInt32LE(data || 0,pos);
			else buffer.writeUInt32BE(data || 0,pos);
		});
};
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
	this.encoder(buffer,pos,data, opt);
};
