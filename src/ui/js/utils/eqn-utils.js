function degToRad(deg) {
  return deg*Math.PI/180;
}

var tmp;

Math.heap = {
  insert : function(array, element, comparator) {
    comparator = comparator || Math.heap.comparator;

    element.heapIdx = array.length;
    array.push(element);

    Math.heap.moveUp(array, array.length - 1, comparator);
  },

  deleteEle : function(array, comparator) {
    comparator = comparator || Math.heap.comparator;
    if(array.length > 0) {
      var ele = array[0];
      array[0] = array[array.length - 1];
      array[array.length - 1].heapIdx = 0;
      delete array[array.length - 1];
      array.length = array.length - 1;
      Math.heap.moveDown(array, 0, comparator);

      return ele;
    }
    return ["null"];
  },

  modified : function(array, element, comparator) {
    Math.heap.moveUp(array, element.heapIdx, comparator);
    Math.heap.moveDown(array, element.heapIdx, comparator);
  },

  moveUp : function(array, i, comparator) {
    var j = Math.floor((i - 1)/2);
    while(j >= 0) {
      if(comparator(array[i], array[j]) > 0.0) {
        tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
        array[i].heapIdx = i;
        array[j].heapIdx = j;
        i = j;
        j = Math.floor((i - 1)/2);
      }
      else {
        break;
      }
    }
  },

  moveDown : function(array, i, comparator) {
    var j = 2*i + 1, k;
    while(j < array.length) {
      if(comparator(array[i], array[j]) < 0.0) {
        tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
        array[i].heapIdx = i;
        array[j].heapIdx = j;
        i = j;
        j = 2*i + 1;
      }
      else if(j + 1 < array.length && comparator(array[i], array[j + 1]) < 0.0) {
        tmp = array[i];
        array[i] = array[j + 1];
        array[j + 1] = tmp;
        array[i].heapIdx = i;
        array[j + 1].heapIdx = j + 1;
        i = j + 1;
        j = 2*i + 2;
      }
      else {
        break;
      }
    }
  },

  comparator : function(a, b) {
    return b - a;
  },
};
Math.hcf = function(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while(a - b !== 0) {
    var a1 = Math.max(a, b), b1 = Math.min(a, b);
    a = b1;
    b = a1 - b1;
  }
  return b;
};

Math.prime = {
  //TODO : check why it breaks for very large numbers
  primeMap : {
    1 : 1,
    2 : 1,
    3 : 1,
    4 : 0,
    5 : 1,
    6 : 0,
    7 : 1,
    8 : 0,
    9 : 0,
  },
  isPrime : function(n) {
    if(Math.prime.primeMap[n]) return Math.prime.primeMap[n];
    else {
      var s = Math.round(Math.sqrt(n)), isPrime = 1;
      for(var i = 2; i <= s; i++) {
        if(n % i === 0) {
          isPrime = 0;
          break;
        }
      }
      Math.prime.primeMap[n] = isPrime;
      return isPrime;
    }
  },
};

Math.factors = {
  primeFactorsMap : {},
  getPrimeFactors : function(n) {
    if(Math.factors.primeFactorsMap[n]) return Math.factors.primeFactorsMap[n];
    if(Math.prime.isPrime(n)) {
      Math.factors.primeFactorsMap[n] = [n];
      return [n];
    }
    var _n = n, i = 2, factors = [];
    while(i <= _n) {
      if(_n % i === 0) {
        factors.push(i);
        _n /= i;
      }
      else {
        i++;
        while(!Math.prime.isPrime(i) && i < _n) {
          i++;
        }
      }
    }
    Math.factors.primeFactorsMap[n] = factors;
    return factors;
  },

  pairsOfFactors : {},
  getPairsOfFactors : function(n) {
    if(Math.factors.pairsOfFactors[n]) return Math.factors.pairsOfFactors[n];
    var factors = Math.factors.getPrimeFactors(n),
        subsetsOfFactors = Math.subsets.getSubsets(factors),
        pairsOfFactors = [], presentMap = {};
    for(var i = 0; i < subsetsOfFactors.length; i++) {
      var a = 1, b = 1;
      for(var j = 0; j < subsetsOfFactors[i][0].length; j++) {
        a *= subsetsOfFactors[i][0][j];
      }
      for(var j = 0; j < subsetsOfFactors[i][1].length; j++) {
        b *= subsetsOfFactors[i][1][j];
      }
      if(!presentMap[a+"__"+b]) pairsOfFactors.push([a, b]);
      presentMap[a+"__"+b] = 1;
    }
    Math.factors.pairsOfFactors[n] = pairsOfFactors;
    return pairsOfFactors;
  },
};

Math.subsets = {
  _subsets : function(set, selected, cur) {
    if(cur === set.length) {
      var subset = [], leftOut = [];
      for(var i = 0, j = 0; i < set.length; i++) {
        if(i === selected[j]) {
          subset.push(set[i]);
          j++;
        }
        else {
          leftOut.push(set[i]);
        }
      }
      return [[subset, leftOut]];
    }
    var subSetsWithout, subSetsWith;
    subSetsWithout = Math.subsets._subsets(set, selected, cur + 1);
    selected.push(cur);
    subSetsWith = Math.subsets._subsets(set, selected, cur + 1);
    selected.pop();
    for(var i = 0; i < subSetsWith.length; i++) {
      subSetsWithout.push(subSetsWith[i]);
    }
    return subSetsWithout;
  },
  getSubsets : function(set) {
    return Math.subsets._subsets(set, [], 0);
  },
};

Math.factorial = {
  factorialMap : {
    0 : 1,
    1 : 1,
    2 : 2,
    3 : 6,
    4 : 24,
  },
  getFactorial : function(n) {
    if(Math.factorial.factorialMap[n]) return Math.factorial.factorialMap[n];
    var factorial = n * Math.factorial.getFactorial(n - 1);
    Math.factorial.factorialMap[n] = factorial;
    return factorial;
  },
};

MathUtils = {};
MathUtils.distributePwrsFor_N_R = {
  //n - total power
  //r - terms count
  //sum of pwrs of r terms = n

  _getPwrsFor_N_R : function(n, r, pwrs, cur, curTotal) {
    if(curTotal === n) {
      var allPwrs = [];
      for(var i = 0; i < pwrs.length; i++) {
        allPwrs.push(pwrs[i]);
      }
      for(var i = pwrs.length; i < r; i++) {
        allPwrs.push(0);
      }
      return [allPwrs];
    }
    if(cur === r) {
      return [];
    }
    var retPwrs = [];
    for(var i = 0; i <= n - curTotal; i++) {
      pwrs[cur] = i;      
      var pwrsFrmChild = MathUtils.distributePwrsFor_N_R._getPwrsFor_N_R(n, r, pwrs, cur + 1, curTotal + pwrs[cur]);
      for(var j = 0; j < pwrsFrmChild.length; j++) {
        retPwrs.push(pwrsFrmChild[j]);
      }
    }
    pwrs[cur] = 0;
    return retPwrs;
  },
  pwrsFor_N_RMap : {},
  distributePwrsFor_N_R : function(n, r) {
    var key = n+"__"+r;
    if(MathUtils.distributePwrsFor_N_R.pwrsFor_N_RMap[key]) MathUtils.distributePwrsFor_N_R.pwrsFor_N_RMap[key];
    var val = MathUtils.distributePwrsFor_N_R._getPwrsFor_N_R(n, r, [], 0, 0);
    MathUtils.distributePwrsFor_N_R.pwrsFor_N_RMap[key] = val;
    return val;
  },
};

//coeffs for (a1+a2+...ar)^n
//each = (n!/(p1!*p2!...pr!))
MathUtils.coeffsForRaiseToPwr = {
  coeffsMap : {},
  coeffMap : {},
  getCoeffs : function(n, r) {
    var key = n+"__"+r;
    if(MathUtils.coeffsForRaiseToPwr.coeffsMap[key]) return MathUtils.coeffsForRaiseToPwr.coeffsMap[key];
    var coeffs = [], dist = MathUtils.distributePwrsFor_N_R.distributePwrsFor_N_R(n, r),
        coeffMap = {};
    for(var i = 0; i < dist.length; i++) {
      coeffs.push(MathUtils.coeffsForRaiseToPwr.getCoeffForAPwrSet(n, dist[i]));
    }
    MathUtils.coeffsForRaiseToPwr.coeffsMap[key] = coeffs;
    return coeffs;
  },

  getCoeffForAPwrSet : function(n, pwrSet) {
    var key = n+"__"+pwrSet.join("__");
    if(MathUtils.coeffsForRaiseToPwr.coeffMap[key]) return MathUtils.coeffsForRaiseToPwr.coeffMap[key];
    var coeff = Math.factorial.getFactorial(n);
    for(var j = 0; j < pwrSet.length; j++) {
      coeff /= Math.factorial.getFactorial(pwrSet[j]);
    }
    MathUtils.coeffsForRaiseToPwr.coeffMap[key] = coeff;
    return coeff;
  },
};

MathUtils.combinations = {
  _select : function(items, selected, cur) {
    if(cur === items.length) {
      var ret = [];
      for(var i = 0; i < selected.length; i++) {
        ret.push(items[i][selected[i]]);
      }
      return [ret];
    }
    var retVals = [];
    for(var i = 0; i < items[cur].length; i++) {
      selected[cur] = i;
      var retVal = MathUtils.combinations._select(items, selected, cur+1);
      for(var j = 0; j < retVal.length; j++) {
        retVals.push(retVal[j]);
      }
    }
    return retVals;
  },
  //n slots with some options for each slot,
  //get all possible selections
  selectionProblem : function(items) {
    return MathUtils.combinations._select(items, [], 0);
  },

  noOfCombinations : function(n, r) {
    return Math.factorial.getFactorial(n) / (Math.factorial.getFactorial(r) * Math.factorial.getFactorial(n - r));
  },
};

var forEachDynamicContent = function(array, callback, context, term, addFun) {
  var eles = [];
  context = context || this;
  while(array.length > 0) {
    var ele = array.shiftObject();
    ele = callback.call(context, ele);
    if(ele) {
      eles.push(ele);
    }
  }
  for(var i = 0; i < eles.length; i++) {
    term.addTerm(eles[i]);
  }
};

var createAndParseTerm = function(termType, termStr) {
  var term = termType.create(), tokens = EQN.EqnTokens.create({str : termStr});
  term.parse(tokens);
  return term;
};
