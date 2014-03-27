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

  hasSTerm : function(sterm) {
    return true;
  },

  copy : function() {
    return EQN.Term.create({
      coeff : this.get("coeff"),
      vari : this.get("vari"),
      pwr : this.get("pwr"),
    });
  },

});
