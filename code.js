
var maxTime = 10000;

var data = {};

function go() {
  var term = document.getElementById("search").value;
  if (term.length < 3) {
    return;
  }
  $("#myTable").find("tr:gt(0)").remove();

  data.term = term;

  fetch("https://cors-anywhere.herokuapp.com/https://github.com/"+data.term+"/network/meta", {
    "headers": {
      "x-requested-with": "XMLHttpRequest"
    },
    "referrer": "https://github.com/"+term+"/network",
    "method": "GET",
  }).then(response => response.json())
  .then(function(meta){
    data.meta = meta;
    prosessChunk(data);
  });
}

function prosessChunk(data) {
  var url = new URL("https://cors-anywhere.herokuapp.com/https://github.com/"+data.term+"/network/chunk");
  var params = {
    nethash: data.meta.nethash,
    start:0,
    end:maxTime
  };
  url.search = new URLSearchParams(params).toString();
  fetch(url, {
    "headers": {
      "x-requested-with": "XMLHttpRequest"
    },
    "referrer": "https://github.com/"+data.term+"/network",
    "method": "GET",
  }).then(response => response.json())
  .then(function(chunk){
    //console.log("got commits ", chunk.commits.length);
    data.chunk = chunk;
    prosess(data);
  });

  data.userRepos = new Map();
  data.meta.users.forEach(u => data.userRepos[u.name] = u.repo);
}

// TODO need to refractor this to not be recursive
function setBranch(commits, branch, c) {
  //console.log("setBranch>", branch, c);
  c.branch = branch;
  if ('parents' in c) {
    c.parents.forEach(p => {
      if (p[0] in commits) {
        setBranch(commits, branch, commits[p[0]]);
      }
    });
  }
}

function prosess(data) {
  //console.log(data);
  // commits tree
  data.commits = new Map();
  data.chunk.commits.forEach(function(c) {
    if (c.id in data.commits) {
      console.log("commit already in tree", c, data.commits[c.id]);
      return
    }
    data.commits[c.id] = c;
  });

// branches
  data.meta.users.forEach(function(u){
    u.heads.forEach(function(h){
      // set head branches
      if (h.id in data.commits) {
        data.commits[h.id].branch = h.name;
        //setBranch(data.commits, h.name, data.commits[h.id]); // tODO testeing removing recursiuon
      } else {
        //console.log("unable to call setBranch for commit head:", h);
        // TODO?
      }
    });
  });

  data.chunk.commits.reverse();

  // display
  console.log(data);
  data.chunk.commits.forEach(c =>
    $('#myTable tr:last').after(makeRow(c))
  );
}

function makeRow(c) {
  row = '<tr>';
  row = row + '<td>'+c.date+'</td>';
  row = row + '<td>'+authorLink(c)+'</td>';
  row = row + '<td>'+findBranch(c)+'</td>';
  row = row + '<td>'+hashLink(c)+'</td>';
  row = row + '<td>'+c.message+'</td>';
  row = row + '</tr>';
  return row;
}

function findBranch(c) {
  // TODO urlencode this and many others
  if ('branch' in c) {
    return '<a href="https://github.com/'+c.login+'/'+data.userRepos[c.login]+'/tree/'+c.branch+'" target="_blank">'+c.branch+'</a>';
  }
  return "???";
}

function hashLink(c) {
  return '<a class="hash" href="https://github.com/'+c.login+'/'+data.userRepos[c.login]+'/commit/'+c.id+'" target="_blank">'+c.id.slice(0, 7)+'</a>';
}

function authorLink(c) {
  var link = c.author;
  if (c.login != "") {
    link = '<a href="https://github.com/'+c.login+'" target="_blank">'+c.login+'</a>';
  }
  if (c.gravatar != "") {
    link = link + '<img height="32" width="32" src="'+c.gravatar+'"/>';
  }
  return link;
}
