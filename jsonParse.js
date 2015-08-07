var jsonParse =  function() {
	var ar, //当前的字符索引
	currentChar, //当前字符
	escapee = {
		'"': '"',
		'/': '/',
		b: 'b',
		f: '\f',
		n: '\n',
		r: '\r',
		t: '\t'
	},

	text,

	error = function(message) { //出错调用函数
		throw {
			name: 'syntaxError',
			message: message,
			at: at,
			text: text
		};
	},

	next = function(curentCh) {
		//如果提供了参数currentch, 就检验他是否匹配当前字符
		if (curentCh && curentCh !== currentChar) {
			error("Expected '" + curentCh + "'instead of '" + ch + "'");
		}
		//获取下一个字符， 当前没有下一个字符时，返回一个空字符串
		currentChar = text.charAt(at);
		at += 1;
		return currentChar;
	}

	number = function() {
		//解析一个数字值
		var number, string = '';
		if (currentChar === '-') {
			string = '-';
			next('-');
		}
		while (currentChar >= '0' && currentChar <= '9') {
			string += currentChar;
			next();
		}
		if (currentChar === '.') {
			string += '.';
			while(next() && currentChar >= '0' && currentChar <= '9') {
				string += currentChar;
			}
		}
		if (currentChar === 'e' || currentChar === 'E') {
			string += currentChar;
			next();
			if (currentChar === '-' || currentChar === '+') {
				string += currentChar;
				next();
			}
			while (currentChar >= '0' && currentChar <= '9') {
				string += currentChar;
				next();
			}
		}
		number =+ string;
		if (isNaN(number)) {
			error("Bad number");
		} else {
			return number;
		}

	},
	string = function() {
		//解析一个字符串
		var hex, i, string = '', uffff;
		//当解析字符串时， 我们必须找到" 和 \ 字符
		if (currentChar === '"') {
			while(next()) {
				if (currentChar === '"') {
					next();
					return string;
				} else if (currentChar === '\\') {
					next();
					if (currentChar === 'u') {
						uffff = 0;
						for (i = 0, i < 4; i += 1) {
							hex = parseInt(next(), 16);
							if (!isFinite(hex)) {
								break;
							}
							uffff = uffff * 16 + hex;
						} else if (typeof escapee[currentChar] == 'string') {
							string += escapee[currentChar];
						} else {
							break;
						}
					}
				} else {
					string += currentChar;
				}
			}
		}
		error("Bad string.");
	},
	white = function() {
		//跳过空白
		while (currentChar && currentChar <= ' ') {
			next();
		}
	},
	word = function () {
		//true, false, null.
		switch (currentChar) {
			case 't':
				next('t');
				next('r');
				next('u');
				next('e');
				return true;
			case 'f':
				next('f');
				next('a');
				next("l");
				next('s');
				next('e');
				return false;
			case 'n':
				next('n');
				next('u');
				next('l');
				next('l');
				return null;
		}
		error("Unexpected '" + ch + "'");
	},
	value, //值函数的占位符
	array =  function() {
		var array = [];
		if (currentChar === '[') {
			next('[');
			white();
			if (currentChar === ']') {
				next(']');
				return array;
			}
			while(currentChar) {
				array.push(value()); 
				white();
				if (currentChar === ']') {
					next(']');
					return array;
				}
				next(',');
				white();
			}
		}
		error("Bad array");
	},
	object = function() {
		var key,
			object = {};
		if (currentChar === '{') {
			next('{');
			white();
			if (currentChar === '}') {
				next('{');
				return object; //空对象
			}
			while (currentChar) {
				key = string();
				white();
				next(':');
				object[key] = value();
				white();
				if (currentChar === '}') {
					next('}');
					return object;
				}
				next(',');
				white();
			}
		}
		error('Bad object');
	},
	//解析一个json值， 它可以是一个对象， 数组，字符串，数字，或者一个词
	value = function() {
		white();
		switch(currentChar) {
			case '{':
				return object();
			case '[':
				return array();
			case '-': 
				return number();
			case '"':
				return string();
			default:
				return currentChar >= '0' && currentChar <= '9' ? number() : word();
		}
	};
	//返回json_parse函数， 它将能访问上述变量和函数
	return function(source, reviver) {
		var result;
		text = source;
		at = 0;
		currentChar = ' ';
		result = value();
		white();
		if (currentChar) {
			error('Syntax error');
		}
		//如果存在reviver函数，我们就地府id对这个新结构调用walk函数
		//开始是先创建一个临时的启动对象，并已一个空字符串作为键名保存结果，
		//然后传递每个“名/值”对给reviver函数去处理可能存在的转化
		//如果没有reviver函数，我们就简单的返回这个结果

		return typeof reviver === 'function' ?
			function walk(holder, key) {
				var k, v, value = holder[key];
				if (value && typeof value === 'object') {
					for (k in value) {
						if (Object.hasOwnProperty.call(value, k)) {
							v = walk(value, k);
							if (v !=== undefined) {
								value[k] = v;
							} else {
								delete value[k];
							}
						}
					}
				}
				return reviver.call(holder, key, value);
			}({'': result}, '') : result;
	};
}();


