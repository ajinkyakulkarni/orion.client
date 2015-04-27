/*******************************************************************************
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var api = require('../api'), writeError = api.writeError;
var git = require('nodegit');
var async = require('async');
var path = require("path");

function getFileIndex(workspaceDir, fileRoot, req, res, next, rest) {
        console.log("rest: " + rest);
        var repo;
        var index;

        var file = rest.substring(rest.indexOf("index/file/") + "index/file/".length);
        var end_of_dir = file.substring(0, file.lastIndexOf("/"));
        var dir = path.join(workspaceDir, end_of_dir);
        var filename = path.join(path.join(workspaceDir, end_of_dir), file);
        console.log("eod: " + end_of_dir);
        console.log(dir + "/.git");

        var result = "";
        git.Repository.open(dir + "/.git")
        .then(function(repoResult) {
            repo = repoResult;
          return repoResult;
        })
        .then(function(repo) {
          return repo.openIndex();
        })
        .then(function(indexResult) {
          index = indexResult;
          return index.read(1);
        })
        .then(function() {
          // this file is in the root of the directory and doesn't need a full path
          var tmp = index.getByPath(filename);
          result += tmp;
          return tmp;
        })
        .then(function() {
          // this file is in a subdirectory and can use a relative path
          var tmp = index.addByPath(path.join(dir, filename));
          result += tmp;
        })
        .done(function(tree) {
          res.write(result);
          res.statusCode = 200;
          res.end();
        });
}

// Stage files
function putStage(workspaceDir, fileRoot, req, res, next, rest) {
  var repo;
  var index;
// http://localhost:8081/gitapi/index/file/test
// http://localhost:8081/gitapi/index/file/test/test.md

  var repoPath = rest.replace("index/file/", "");
  var filePath = repoPath.substring(repoPath.indexOf("/")+1);
  repoPath = repoPath.indexOf("/") === -1 ? repoPath : repoPath.substring(0, repoPath.indexOf("/"));
  var fileDir = repoPath;
  repoPath = api.join(workspaceDir, repoPath);


  git.Repository.open(repoPath)
  .then(function(repoResult) {
    repo = repoResult;
    return repoResult;
  })
  .then(function(repo) {
    return repo.openIndex();
  })
  .then(function(indexResult) {
    index = indexResult;
    return index.read(1);
  })
  .then(function() {
    if (req.body.Path) {
      req.body.Path.forEach(function(path) {
        index.addByPath(path);
      })
    } else {
      return index.addByPath(filePath);
    }
  })
  .then(function() {
    // this will write both files to the index
    return index.write();
  })
  .then(function() {
    return index.writeTree();
  })
  .done(function(tree) {
    res.statusCode = 200;
    res.end();
  });
}

// unstage files
function postStage(workspaceDir, fileRoot, req, res, next, rest) {
  var repo;
  var index;

  var repoPath = rest.replace("index/file/", "");
  var filePath = repoPath.substring(repoPath.indexOf("/")+1);
  repoPath = repoPath.indexOf("/") === -1 ? repoPath : repoPath.substring(0, repoPath.indexOf("/"));
  var fileDir = repoPath;
  repoPath = api.join(workspaceDir, repoPath);

  git.Repository.open(repoPath)
  .then(function(repoResult) {
    repo = repoResult;
    return repoResult;
  })
  .then(function(repo) {
    return repo.openIndex();
  })
  .then(function(indexResult) {
    index = indexResult;
    return index.read(1);
  })
  .then(function() {
    if (req.body.Path) {
      if (typeof req.body.Path == "string") {
        return index.removeByPath(filePath);
      } else {
        req.body.Path.forEach(function(path) {
          index.removeByPath(path);
        })
      }
    } else if (req.body.Reset) {
      index.removeAll(".")
      .then(function(result) {
        return result
      });
    } else {
      return index.removeByPath(filePath);
    }
  })
  .then(function() {
    return index.write();
  })
  .then(function() {
    return index.writeTree();
  })
  .done(function(tree) {
    res.statusCode = 200;
    res.end();
  });
}

module.exports = {
    putStage: putStage,
    postStage: postStage,
    getFileIndex: getFileIndex
};