EQN.EqnTokens = Ember.Object.extend({
  //primitive tokensizer
  //TODO : implement a proper lexer to parse equations

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
  '^' : 1,
};
EQN.NUMBER_REGEX = /^[0-9]*(?:\.[0-9]+)?$/,

EQN.Term = Ember.Object.extend({
  type : 0,
  coeff : 1,
  pwr : 1,
  //term string without power or coeff
  vari : "",
  //term string with power, used for sorting and comparing in EQN.TermBracket
  sortStr : function() {
    var vari = this.get("vari"), pwr = this.get("pwr");
    return vari+(pwr !== 1 ? "^"+pwr : "");
  }.property('vari', 'pwr'),
  //term string with power and coeff, used for forming the parent Term
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
        //if operator is -, negate coeff
        this.set("coeff", -1);
        this.set("op",  "+");
      }
      else if(this.op === "/") {
        //if operator is /, negate pwr
        this.set("op", "*");
        this.set("pwr", -1);
      }
      //'op' is deprecated
      t = tokens.next();
    }
    if(t === "(") {
      //if token is open brace, put the operator and bracket back and parse EQN.TermBracket
      tokens.back(2);
      return EQN.TermBracket.create({terms : []}).parse(tokens);
    }
    var isNum = 0;
    if(EQN.NUMBER_REGEX.test(t)) {
      //if the token is a number, assign it to coeff
      //multiply the current coeff if there was a negative
      this.set("coeff", this.get("coeff") * Number(t));
      t = tokens.next();
      isNum = 1;
    }
    if(EQN.operators[t]) {
      if(t === "+" || t === "-" || t === ")") {
        //if next token is +/-/), put back the operator and start parsing next term
        tokens.back();
        return this;
      }
      else {
        if(t === "*" || t === "/") {
          //if operator is /, negate pwr
          if(t === "/") this.set("pwr", -1);
          t = tokens.next();
        }
        else if(t === "^") {
          //if operator is ^, compute pwr
          t = tokens.next();
          this.set("coeff", Math.pow(this.get("coeff"), Number(t)));
          return this;
        }
        /*if(isNum === 1) {
          tokens.back();
          returnt this;
        }*/
      }
    }
    //the next token is always a vairable
    this.set("vari", t);
    t = tokens.next();
    if(t === "^") {
      //if next token is ^, compute pwr
      t = tokens.next();
      if(t === "-") {
        //negate the pwr if token operate is -
        this.set("pwr", -this.get("pwr"));
        t = tokens.next();
      }
      this.set("pwr", this.get("pwr") * Number(t));
      return this;
    }
    if(t) tokens.back();
    return this;
  },

  simplify : function(sterm) {
    return this;
  },

  multiply : function(term, sterm) {
    if(term.get("type") > 0) return term.multiply(this, sterm);
    var t = new TermMultiply({terms : [this]});
    return t.multiply(term, sterm);
  },

});

EQN.TermBracket = EQN.Term.extend({
  type : 2,

  init : function() {
    this._super();
    Ember.addBeforeObserver(this, "terms", this, "termsWillChange");
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
    var terms = this.get("terms");
    terms.addArrayObserver(this, {
      willChange : this.termsArrayWillChange,
      didChange : this.termsArrayDidChange,
    });
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
    var zeroCoeffTerms = terms.findBy('coeff', 0), zeroPowerTerms = terms.findBy('pwr', 0);
    if(zeroCoeffTerms) {
      zeroCoeffTerms.forEach(function(item) {
        this.removeObject(item);
      }, terms);
    }
    if(zeroPowerTerms) {
      zeroPowerTerms.forEach(function(item) {
        this.removeObject(item);
      }, terms);
    }
  },

  filterAddedObjs : function(addedObjs) {
    addedObjs.forEach(function(item) {
      //search for duplicates with same addable type
      var terms = this.get("terms"), term = terms.findBy("sortStr", item.get("sortStr"));
      if(term) {
        terms.removeObject(term);
        //add the coeff if found
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
      //if the token is operator, and operator is -, negate coeff
      if(t === "-") this.set("coeff", -1);
      //if the operator is /, negate the power
      else if(t === "/") this.set("pwr", -1);
      t = tokens.next();
    }
    else {
      //else put the token back in the pool to be scanned later
      tokens.back(); 
    }
    while(!tokens.isEmpty()) {
      t = tokens.next();
      if(t === "(") {
        //tokens.back();
        //if the token is an opening bracket, start parsing of EQN.TermBracket
        ct = EQN.TermBracket.create({terms : []}).parse(tokens);
      }
      else {
        //else put the token back and start parsing of EQN.Term
        tokens.back();
        ct = EQN.Term.create({}).parse(tokens);
      }
      t = tokens.next();
      if(t === "*" || t === "/") {
        //if the next token is * or / then start parsing of EQN.TermMultiply
        tokens.back();
        this.addTerm(EQN.TermMultiply.create({terms : [ct]}).parse(tokens));
      }
      else {
        //else add the term to this EQN.TermBracket
        tokens.back();
        this.addTerm(ct);
      }
      t = tokens.next();
      //if next term is a closing bracket, current EQN.TermBracket has closed
      if(t === ")") break;
      //break if tokens are exhausted
      if(!t) return this;
      tokens.back();
    }
    t = tokens.next();
    if(t === "^") {
      //parse the power if the next token is ^
      this.set("pwr", Number(tokens.next()));
    }
    else if(t) {
      tokens.back();
    }
    return this;
  },

  simplify : function(sterm) {
    var terms = this.get("terms"), term;
    for(var i = 0; !Ember.isEmpty(terms);) {
      //simplify each term and add it if it is valid
      term = terms[i].simplify(sterm);
      terms.removeAt(i);
      if(term) {
        //TODO : Handle removal of duplicates in beforeAddObserver
        terms.insertAt(i++, term);
      }
    }
    if(terms.length === 1) {
      //return the single term instead of having a EQN.TermBracket with single term
      if(!term) term = terms[0];
      term.set("coeff", term.get("coeff") * this.get("coeff"));
      term.set("pwr", term.get("pwr") * this.get("pwr"));
    }
    else {
      term = this;
    }

    if(term && term.get("type") > 0 && term.get("pwr") !== 1) {
      //if 'term' is a EQN.TermBracket or EQN.TermMultiply then raise it to power
      term = term.power(term.get("pwr"), sterm, 1);
    }

    return t;
  },

  power : function(pwr, sterm, dontRaisePwr) {
    //seperate terms into 2 sets of terms, st - single 1st term, mt - remaining terms as a EQN.TermBracket
    //br - 1 if mt has multiple terms
    var ncr = 1, ts = this.get("terms"),
        st, mt, terms = [], newTerms = [],
        br = 0, stf = 0;

    if(pwr === 0) return null;

    //put all the terms which has 'sterm' in the begining, rest at the end
    //only the terms with 'sterm' will be expanded
    for(var i = 0; i < ts.length; i++) {
      if(ts[i].hasSTerm(sterm) === 1) {
        terms.unshift(ts[i]);
        stf = 1;
      }
      else terms.push(ts[i]);
    }

    //if there are no terms with 'sterm', and dontRaisePwr is null, return 'this' unaltered
    if(stf === 0) {
      if(!dontRaisePwr) this.pwr *= pwr;
      return this;
    }
    st = terms.shift();

    //this.terms = [];
    if(terms.length !== 1) {
      //form a EQN.TermBracket if there are multiple terms in the 2nd set
      mt = EQN.TermBracket.create({terms : terms});
      br = 1;
    }
    else {
      //else assign the 2nd term to mt
      mt = terms.shift();
    }

    this.set("terms", Ember.A([]));
    //apply 'Binomial theorem', Tn = nCr * a^r * b^(n-r)
    for(var i = 0; i <= pwr; i++) {
      var sti = Ember.copy(st), mti = Ember.copy(mt);
      sti = sti.power(pwr - i, sterm);
      mti = mti.power(i, sterm);
      var ct = sti || mti;
      if(sti && mti) ct = ct.multiply(mti);
      ct.coeff *= ncr;
      this.addTerm(ct);
      ncr *= (pwr - i)/(i + 1);
    }
    this.pwr = 1;
    return this;
  },

  multiply : function(term, sterm) {
    var terms = this.terms;
    if(term.get("type") < 2) {
      //if the term is a simple term or a EQN.TermMultiply, multiply 'term' to every term in the EQN.TermBracket
      for(var i = 0; i < terms.length; i++) {
        var mt = terms[i].multiply(term, sterm);
        terms.removeAt(i);
        terms.insertAt(i, mt);
      }
    }
    else {
      //else multiply every term of 'term' (a EQN.TermBracket) with every term in 'this' EQN.TermBracket
      this.set("terms", Ember.A([]));
      var tterms = term.get("terms");
      for(var i = 0; i < terms.length; i++) {
        for(var j = 0; j < tterms.length; j++) {
          this.addTerm(terms[i].multiply(tterms[j]));
        }
      }
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
  init : function() {
    this._super();
    var terms = this.get("terms");
    //pull the coeffs of each term to 'this' term
    terms.forEach(function(item) {
      this.set("coeff", this.get("coeff") * item.get("coeff"));
      item.set("coeff", 1);
    }, this);
  },

  type : 1,

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
        //if a term of the same type as the added term already exists,
        //add its power to added term and delete it
        terms.removeObject(term);
        item.set("coeff", item.get("coeff") * term.get("coeff"));
        item.set("pwr", item.get("pwr") + term.get("pwr"));
      }
      //pull the coeff of added term to 'this' term
      this.set("coeff", this.get("coeff") * item.get("coeff"));
      item.set("coeff", 1);
      if(item.get("type") === 1) {
        //if the added term is a EQN.TermMultiply, add the terms to 'this' term
        item.get("terms").forEach(function(t) {
          //multiply each term's power to parent term's power and add it to 'this' term
          t.set("pwr", t.get("pwr") * this.item.get("pwr"));
          this.that.addTerm(t);
        }, {that : this, item : item});
        //set the power to 0 so that this is removed
        item.set("pwr", 0);
      }
    }, this);
  },

  parse : function(tokens) {
    var t = tokens.next(), ct;
    if(this.get("terms").length === 0) {
      //if no terms were parsed, calculate coeff, pwr based on operator
      if(t === "-") this.set("coeff", -1);
      else if(t === "/") this.set("pwr", -1);
      t = tokens.next();
      //update coeff if next token is a number, else put the token back
      if(EQN.NUMBER_REGEX.test(t)) this.set("coeff", this.get("coeff") * Number(t));
      else tokens.back();
    }
    else {
      //else put the token back
      tokens.back();
    }
    while(!tokens.isEmpty()) {
      //create a EQN.Term, parse of EQN.Term will redirect to other terms
      ct = EQN.Term.create({}).parse(tokens);
      this.addTerm(ct);
      t = tokens.next();
      if(t === "+" || t === "-" || t === ")") {
        //if next token is '+' or '-' close the EQN.TermMultiply
        // ')' ??
        tokens.back();
        return this;
      }
      else if(t) {
        //else put the token back
        tokens.back();
      }
    }
    return this;
  },

  simplify : function(sterm) {
    var terms = this.get("terms");
    for(var i = 0; !Ember.isEmpty(terms);) {
      var term = terms[i].simplify(sterm);
      terms.removeAt(i);
      if(term) {
        if(term.get("type") > 0 || !Ember.isEmpty(term.get("vari"))) {
          //if simplified term is not a just number
          //type check for EQN.TermMultiply or EQN.TermBracket
          //vari check for EQN.Term with a variable
          //TODO : handle dumplicates removed in beforeAddObserver
          terms.insertAt(i++, term);
        }
        else if(term.get("coeff") !== 1) {
          //if the term is a number but not 1
          //TODO : handle real numbers
          this.set("coeff", this.get("coeff") * term.get("coeff"));
        }
      }
      //increment i only if the simplified term was added,
      //else next term will still be at ith position
    }
    if(terms.get("length") === 0) {
      //if no terms were retained after simplification, return a EQN.Term with just the coeff
      return EQN.Term.create({coeff : this.coeff});
    }

    /*  expand brackets inside the EQN.TermMultiply  */

    //bt - 1st EQN.TermBracket
    //mts - EQN.TermBrackets not in bt
    //smt - a EQN.TermMultiply with terms in 'this' which is not EQN.TermBrackets, or doesnt have sterm
    var mts = [], smt = EQN.TermMultiply.create({terms : []}), bt = null;

    for(var i = 0; terms.get("length"); i++) {
      if(terms[i].get("type") === 0 || terms[i].get("pwr") !== 1 || !terms[i].hasSTerm(sterm)) {
        //add to smt if terms[i] is EQN.Term, power is not 1 or doesnt have sterm
        smt.addTerm(terms[i]);
      }
      else {
        //else is a term with multiple child terms
        if(!bt) {
          //if 1st multi term, assign it to 'bt'
          bt = terms[i];
        }
        else {
          //else push to mts
          mts.push(terms[i]);
        }
      }
    }

    if(smt.get("terms").get("length") !== 0) {
      //if there are single terms
      if(!bt) {
        //if there are no multi term, return 'this' as it needs no further simplification
        return this;
      }
      //else multiply the smt to bt
      bt.multiply(smt, sterm);
    }

    for(var i = 0; i < mts.length; i++) {
      //multiply bt to all remaining 'multi term' terms
      bt.multiply(mts[i], sterm);
    }

    //move the coeff from 'this' to 'bt'
    bt.set("coeff", this.get("coeff"));

    //simplify all terms after expanding brackets
    bt = bt.simplify(sterm);

    return bt
  },

  power : function(pwr, sterm) {
    if(pwr !== 0) {
      //raise each to pwr and set pwr of 'this' to 1
      this.set("coeff", Math.pow(this.get("coeff"), pwr));
      var terms = this.get("terms");
      for(var i = 0; i < terms.length; i++) {
        terms[i].power(pwr, sterm);
      }
      this.set("pwr", 1);
      return this;
    }
    return null;
  },

  multiply : function(term, sterm) {
    var ttype = term.get("type");
    if(ttype === 2) {
      //if term is a EQN.TermBracket then multiply 'this' to 'term'
      return term.multiply(this, sterm);
    }
    var ts = (ttype === 1 ? term.get("terms") : Ember.A([term]));
    //add the terms in EQN.TermMultiply or the single EQN.Term to 'this' term
    for(var i = 0; i < ts.length; i++) {
      this.addTerm(ts[i]);
    }
    if(ttype === 1) {
      //if term is a EQN.TermMultiply, multiply its coeff to coeff of 'this'
      //in case of EQN.Term, coeff is multiplied in addTerm call
      this.set("coeff", this.get("coeff") * term.get("coeff"));
    }
    return this;
  },
  
});
