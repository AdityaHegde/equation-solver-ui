EQN.EqnTokens = Ember.Object.extend({
  init : function() {
    this._super();
    var str = this.get("str");
    str = str.replace(/\s+/g, " ");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2 $3");
    str = str.replace(/(\(|\)|\+|-|\*|\/|\^)([^\s])/g, "$1 $2");
    str = str.replace(/([^\s])(\(|\)|\+|-|\*|\/|\^)/g, "$1 $2");
    this.set("tokens", str.split(" "));
  },
  str : "",
  tokens : [],
  cur : 0,

  next : function() {
    var cur = this.get("cur"), tokens = this.get("tokens");
    if(cur >= tokens.length) return undefined;
    this.set("cur", cur+1);
    return tokens[cur];
  },

  back : function(amt) {
    var cur = this.get("cur"), tokens = this.get("tokens");
    amt = amt || 1;
    if(cur + amt <= tokens.length) {
      this.set("cur", cur - amt);
    }
  },

  isEmpty : function() {
    return this.get("cur") >= this.get("tokens").length;
  },
});

EQN.Eqn = Ember.Object.extend({
  eqnStr : "",
  parsedEqn : "",
  term : null,

  buildEqn : function() {
    var tokens = EQN.EqnTokens.create({str : this.get("eqnStr")}),
        term = EQN.TermBracket.create({});
    term = term.parse(tokens);
    this.set("term", term);
    this.set("parsedEqn", term.get("fullStr"));
  },
});

EQN.operators = {
  '+' : 1,
  '-' : 1,
  '*' : 1,
  '/' : 1,
};
EQN.NUMBER_REGEX = /^[0-9]*(?:\.[0-9]+)?$/,

EQN.Term = Ember.Object.extend({
  coeff : 1,
  pwr : 1,
  vari : "",
  sortStr : function() {
    var vari = this.get("vari"), pwr = this.get("pwr");
    return vari+(pwr !== 1 ? "^"+pwr : "");
  }.property('vari', 'pwr'),
  fullStr : function() {
    var sortStr = this.get("sortStr"), coeff = this.get("coeff");
    if(Ember.isEmpty(sortStr)) {
      return (coeff < 0 ? "("+coeff+")" : coeff);
    }
    else {
      return (coeff < 0 ? "("+coeff+sortStr+")" : (coeff !== 1 ? coeff+sortStr : sortStr));
    }
  }.property('sortStr', 'coeff'),

  parse : function(tokens) {
    var t = tokens.next();
    if(EQN.operators[t]) {
      this.set("op",  t);
      if(this.op === "-") {
        this.set("coeff", -1);
        this.set("op",  "+");
      }
      else if(this.op === "/") {
        this.set("op", "*");
        this.set("pwr", -1);
      }
      t = tokens.next();
    }
    if(t === "(") {
      tokens.back(2);
      return EQN.TermBracket.create({terms : []}).parse(tokens);
    }
    var isNum = 0;
    if(EQN.NUMBER_REGEX.exec(t)) {
      this.set("coeff", this.get("coeff") * Number(t));
      t = tokens.next();
      isNum = 1;
    }
    if(EQN.operators[t]) {
      if(t === "+" || t === "-" || t === ")") {
        tokens.back();
        return this;
      }
      else {
        if(isNum === 1) {
          tokens.back();
          return this;
        }
        if(t === "*" || t === "/") {
          if(t === "/") this.set("pwr", -1);
          t = tokens.next();
        }
        else if(t === "^") {
          t = tokens.next();
          this.set("coeff", Math.pow(this.get("coeff"), Number(t)));
          return this;
        }
      }
    }
    this.set("vari", t);
    t = tokens.next();
    if(t === "^") {
      t = tokens.next();
      if(t === "-") {
        this.set("pwr", -this.get("pwr"));
        t = tokens.next();
      }
      this.set("pwr", this.get("pwr") * Number(t));
      return this;
    }
    if(t) tokens.back();
    return this;
  },
});

EQN.TermBracket = EQN.Term.extend({
  init : function() {
    this._super();
    //Ember.addBeforeObserver(this, "terms", this, "termsWillChange");
    this.set("terms", this.get("terms") || []);
    var terms = this.get("terms");
    terms.addArrayObserver(this, {
      willChange : this.termsArrayWillChange,
      didChange : this.termsArrayDidChange,
    });
  },

  termsWillChange : function() {
    var terms = this.get("terms");
    if(terms) {
      terms.removeArrayObserver(this);
    }
  },

  termsDidChange : function() {
    /*var terms = this.get("terms");
    terms.addArrayObserver(this, {
      arrayWillChange : this.termsArrayWillChange,
      arrayDidChange : this.termsArrayDidChange,
    });*/
  }.property('terms'),

  terms : null,
  vari : function() {
    var terms = this.get("terms"), pwr = this.get("pwr");
    terms = Ember.A(terms.sort(EQN.TermBracket.sort_fun));
    var termsStr = terms.mapBy("fullStr").join("+");
    return "("+termsStr+")";
  }.property('terms.@each.sortStr', 'terms.@each.fullStr'),

  termsArrayWillChange : function(terms, idx, removedCount, addedCount) {
  },

  termsArrayDidChange : function(terms, idx, removedCount, addedCount) {
    var addedObjs = Ember.A(terms.splice(idx, idx + addedCount));
    this.filterAddedObjs(addedObjs);
    for(var i = 0; i < addedObjs.length; i++) {
      terms.splice(i + idx, 0, addedObjs[i]);
    }
  },

  filterAddedObjs : function(addedObjs) {
    addedObjs.forEach(function(item) {
      var terms = this.get("terms"), term = terms.findBy("sortStr", item.get("sortStr"));
      if(term) {
        terms.removeObject(term);
        item.set("coeff", item.get("coeff") + term.get("coeff"));
      }
    }, this);
  },

  addTerm : function(term) {
    this.get("terms").pushObject(term);
  },

  parse : function(tokens) {
    var t = tokens.next(), ct;
    if(EQN.operators[t]) {
      if(t === "-") this.set("coeff", -1);
      else if(t === "/") this.set("pwr", -1);
      t = tokens.next();
    }
    else tokens.back();
    while(!tokens.isEmpty()) {
      t = tokens.next();
      if(t === "(") {
        //tokens.back();
        ct = EQN.TermBracket.create({terms : []}).parse(tokens);
      }
      else {
        tokens.back();
        ct = EQN.Term.create({}).parse(tokens);
      }
      t = tokens.next();
      if(t === "*" || t === "/") {
        tokens.back();
        this.addTerm(EQN.TermMultiply.create({terms : [ct]}).parse(tokens));
      }
      else {
        tokens.back();
        this.addTerm(ct);
      }
      t = tokens.next();
      if(t === ")") break;
      if(!t) return this;
      tokens.back();
    }
    t = tokens.next();
    if(t === "^") {
      this.set("pwr", Number(tokens.next()));
    }
    else if(t) {
      tokens.back();
    }
    return this;
  },
});
EQN.TermBracket.strcmp = function(a, b) {return a.length === b.length ? (a > b ? 1 : -1) : (a.length > b.length ? 1 : -1)};
EQN.TermBracket.strcmp1 = function(a, b) {return a.length === b.length ? (a == b ? 0 : (a > b ? 1 : -1)) : (a.length > b.length ? 1 : -1)};
EQN.TermBracket.comparator = function(a, b) {
  if(a[0] === b[0]) {
    var strcmp = EQN.TermBracket.strcmp1(a[1], b[1]);
    if(strcmp === 0) a[2] - b[2];
    return -strcmp;
  }
  return a[0] - b[0];
};
EQN.TermBracket.sort_fun = function(a, b) {return EQN.TermBracket.strcmp(a.get("sortStr"), b.get("sortStr"))};

EQN.TermMultiply = EQN.TermBracket.extend({
  vari : function() {
    var terms = this.get("terms"), pwr = this.get("pwr");
    terms = Ember.A(terms.sort(EQN.TermBracket.sort_fun));
    var termsStr = terms.mapBy("fullStr").join("*");
    return termsStr;
  }.property('terms.@each.sortStr', 'terms.@each.fullStr', 'pwr'),

  filterAddedObjs : function(addedObjs) {
    addedObjs.forEach(function(item) {
      var terms = this.get("terms"), term = terms.findBy("vari", item.get("vari"));
      if(term) {
        terms.removeObject(term);
        item.set("coeff", item.get("coeff") * term.get("coeff"));
        item.set("pwr", item.get("pwr") + term.get("pwr"));
      }
    }, this);
  },

  parse : function(tokens) {
    var t = tokens.next(), ct;
    if(this.terms.length === 0) {
      if(t === "-") this.set("coeff", -1);
      else if(t === "/") this.set("pwr", -1);
      t = tokens.next();
      if(EQN.NUMBER_REGEX.exec(t)) this.set("coeff", this.get("coeff") * Number(t));
      else tokens.back();
    }
    else tokens.back();
    while(!tokens.isEmpty()) {
      ct = EQN.Term.create({}).parse(tokens);
      this.addTerm(ct);
      t = tokens.next();
      if(t === "+" || t === "-" || t === ")") {
        tokens.back();
        return this;
      }
      else if(t) tokens.back();
    }
    return this;
  },
});
