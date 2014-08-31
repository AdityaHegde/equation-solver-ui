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
      return coeff;
    }
    else {
      return (Math.abs(coeff) !== 1 ? coeff+sortStr : (coeff === 1 ? sortStr : "-"+sortStr));
    }
  }.property('sortStr', 'coeff'),

  vars : function() {
    var vari = this.get("vari");
    if(Ember.isEmpty(vari)) {
      return [];
    }
    else {
      return [[vari, 1]];
    }
  }.property("vari"),

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
          return this;
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

  power : function(pwr, sterm, dontRaisePwr) {
    if(pwr === 0) {
      return null;
    }
    //multiply the pwr and raise coeff
    this.set("pwr", this.get("pwr") * pwr);
    this.set("coeff", Math.pow(this.get("coeff"), pwr));
    return this;
  },

  multiply : function(term, sterm) {
    //if 'term' has an EQN.TermBracket or an EQN.TermMultiply
    if(term.get("type") > 0) return term.multiply(this, sterm);
    //else create an EQN.TermMultiply with 'this' child term
    var t = EQN.TermMultiply.create({terms : [this]});
    //and multiply term to it
    return t.multiply(term, sterm);
  },

  hasSTerm : function(sterm) {
    //return true if sterm is null
    //if there is no sterm, expand all brackets
    if(!sterm || Ember.typeOf(sterm) !== "instance") return true;
    //check with 'this' 'vari'
    if(this.get("vari") === sterm.get("vari")) return true;
    return false;
  },

  canCollapse : function() {
    return false;
  },

  replace : function(rterm, wterm) {
    //replace 'rterm' with 'wterm'
    if(this.get("vari") === rterm.get("vari")) {
      var wtterm = wterm.copy();
      wtterm.set("coeff", wtterm.get("coeff") * this.get("coeff"));
      wtterm.set("pwr", wtterm.get("pwr") * this.get("pwr"));
      return wtterm;
    }
    return this;
  },

  segregate : function(term, pwr) {
    pwr = pwr || this.get("pwr");
    if(this.get("vari") === term.get("vari") && this.get("pwr") >= pwr) {
      var pwrDiff = this.get("pwr") - pwr, tcopy = EQN.Term.create({vari : term.get("vari"), pwr : pwr});
      if(pwrDiff === 0) {
        return [EQN.Term.create({coeff : this.coeff}), tcopy];
      }
      this.set("pwr", pwrDiff || 1);
      return [this, tcopy];
    }
    return [this, null];
  },

  addSingleTermToHeap : function(term, termHeap, termRef) {
    //termRef has the reference to the corresponding element in termHeap for a term with power
    //key is vari__pwr
    for(var i = 1; i <= term.get("pwr"); i++) {
      var key = term.get("vari")+"__"+i;
      if(termRef[key]) {
        //if the term is already found, increase the count and modify the heap
        termRef[key][0]++;
        heap.modified(termHeap, termRef[key], EQN.TermBracket.comparator);
      }
      else {
        //else add an array object to heap with count as 0th element, vari as 1st and pwr as 2nd
        termRef[key] = [1, term.get("vari"), i];
        heap.insert(termHeap, termRef[key], EQN.TermBracket.comparator);
      }
    }
  },

  addTermToHeap : function(termHeap, termRef) {
    //add 'this' term to heap
    this.addSingleTermToHeap(this, termHeap, termRef);
  },

  factorize : function(sterm) {
    return this;
  },

  copy : function() {
    //create a new EQN.TermBracket with same coeff, pwr and vari
    return EQN.Term.create({
      coeff : this.get("coeff"),
      vari : this.get("vari"),
      pwr : this.get("pwr"),
    });
  },

});

