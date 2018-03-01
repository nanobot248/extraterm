/*
 * Copyright 2014-2017 Simon Edwards <simon@simonzone.com>
 *
 * This source code is licensed under the MIT license which is detailed in the LICENSE.txt file.
 */
require('shelljs/global');
const fs = require('fs');
const path = require('path');
const packager = require('electron-packager');

const log = console.log.bind(console);
const BUILD_TMP = 'build_tmp';
const MODULE_VERSON = 53; // This version number also appears in thememanager.ts

function main() {
  "use strict";
  
  if ( ! test('-f', './package.json')) {
    echo("This script was called from the wrong directory.");
    return;
  }

  const srcRootDir = pwd();
  if (test('-d', BUILD_TMP)) {
    rm('-rf', BUILD_TMP);
  }
  mkdir(BUILD_TMP);
  
  const packageJson = fs.readFileSync('package.json');
  const packageData = JSON.parse(packageJson);
  
  const gitUrl = packageData.repository.url.replace("git://github.com/", "git@github.com:");
  
  echo("Fetching a clean copy of the source code from " + gitUrl);
  cd(BUILD_TMP);

  // For some reason pwd() is returning "not quite strings" which path.join() doesn't like. Thus "" + ...
  const buildTmpPath = "" + pwd();
  
  exec("git clone --depth 1 " + gitUrl);
  
  echo("Setting up the run time dependencies in " + BUILD_TMP);

  cd("extraterm");

  echo("Building web-component-decorators");
  exec("npm run npm-install-web-component-decorators");
  exec("npm run build-web-component-decorators");

  echo("Downloading main dependencies.");
  exec("npm install");
  exec("npm run npm-install-extensions");
  
  echo("Building main");
  exec("npm run build");
  exec("npm run build-extensions");

  echo("Removing development dependencies");
  //exec("npm prune --production");
  //exec("npm run npm-prune-extensions");

  // Create the commands zip
  echo("Creating commands.zip");
  const commandsDir = packageData.name + "-commands-" + packageData.version;
  cp("-r", "src/commands", path.join(buildTmpPath, commandsDir));
  const codeDir = pwd();
  cd(buildTmpPath);
  exec(`zip -y -r ${commandsDir}.zip ${commandsDir}`);
  cd(codeDir);

  const electronVersion = packageData.devDependencies['electron'];

  const ignoreRegExp = [
    /^\/build_scripts\b/,
    /^\/extraterm-web-component-decorators\b/,
    /^\/extraterm-extension-api\b/,
    /^\/test\b/,
    /^\/build_tmp\b/,
    /^\/src\/typedocs\b/,
    /\.ts$/,
    /\.js\.map$/,
    /^\/\.git\//,
    /^\/docs\b/,
    /^\/resources\/extra_icons\b/,
    /^\/src\/test\b/,
    /^\/src\/testfiles\b/
  ];

  const ignoreFunc = function ignoreFunc(filePath) {
    const result = ignoreRegExp.some( (exp) => exp.test(filePath));
    return result;
  };

  function appDir(platform) {
    return platform === "darwin" ? "extraterm.app/Contents/Resources/app" : "resources/app";
  }

  function pruneNodeSass(versionedOutputDir, arch, platform) {
    const gutsDir = appDir(platform);
    const nodeSassVendorDir = path.join(versionedOutputDir, gutsDir, "node_modules/node-sass/vendor");

    rm('-rf', nodeSassVendorDir);
    
    const nodeSassBinaryDir = path.join(versionedOutputDir, gutsDir, "src/node-sass-binary");
    ["darwin-x64", "linux-ia32", "linux-x64", "win32-x64"].forEach( (name) => {
      if (name !== platform + "-" + arch) {
        rm('-rf', path.join(nodeSassBinaryDir, name + "-" + MODULE_VERSON));
      }
    });
  }

  function pruneEmojiOne(versionedOutputDir, platform) {
    if (platform !== "linux") {
      const emojiOnePath = path.join(versionedOutputDir, appDir(platform), "resources/themes/default/emojione-android.ttf");
      rm(emojiOnePath);
    }
  }

  function pruneNodeModules(versionedOutputDir, platform) {
    const prevDir = pwd();
    
    cd(path.join(versionedOutputDir, appDir(platform)));
    exec("modclean -n default:safe -r");
    pruneSpecificNodeModules();

    cd(prevDir);
  }

  function pruneSpecificNodeModules() {
    [
      "codemirror/src",
      "ptyw.js/vendor",
      "ptyw.js/src",
      "ptyw.js/node_modules/nan",
      "node-sass/src",
      "node-sass/node_modules/nan",
      "node-gyp",
      "ajv",
      "globule",
      "vue/src",
      "vue/dist/vue.esm.browser.js",
      "vue/dist/vue.esm.js",
      "vue/dist/vue.js",
      "vue/dist/vue.min.js",
      "vue/dist/vue.runtime.esm.js",
      "vue/dist/vue.runtime.js",
      "vue/dist/vue.runtime.min.js",
      "font-manager/src",
      ".bin"
    ].forEach( (subpath) => {
      const fullPath = path.join("node_modules", subpath);

      echo("Deleting " + fullPath);

      if (test('-d', fullPath)) {
        rm('-rf', fullPath);
      } else if (test('-f', fullPath)) {
          rm(fullPath);
      } else {
        echo("----------- Unable to find path "+ fullPath);
      }
    });

  }

  function makePackage(arch, platform) {
    log("");
    return new Promise(function(resolve, reject) {
      
      // Clean up the output dirs and files first.
      const versionedOutputDir = packageData.name + "-" + packageData.version + "-" + platform + "-" + arch;
      if (test('-d', versionedOutputDir)) {
        rm('-rf', versionedOutputDir);
      }
      
      const outputZip = path.join(buildTmpPath, versionedOutputDir + ".zip");

      const packagerOptions = {
        arch: arch,
        dir: ".",
        platform: platform,
        version: electronVersion,
        ignore: ignoreFunc,
        overwrite: true,
        out: buildTmpPath
      };
      if (platform === "win32") {
        packagerOptions.icon = "resources/logo/extraterm_small_logo.ico";
        packagerOptions.win32metadata = {
          FileDescription: "Extraterm",
          ProductName: "Extraterm",
          LegalCopyright: "(C) 2018 Simon Edwards"
        };
      } else if (platform === "darwin") {
        packagerOptions.icon = "resources/logo/extraterm_small_logo.icns";
      }

      packager(packagerOptions, function done(err, appPath) {
        if (err !== null) {
          log(err);
          reject();
        } else {
          // Rename the output dir to a one with a version number in it.
          mv(appPath[0], path.join(buildTmpPath, versionedOutputDir));
          
          const thisCD = pwd();
          cd(buildTmpPath);

          pruneNodeModules(versionedOutputDir, platform);

          // Prune any unneeded node-sass binaries.
          pruneNodeSass(versionedOutputDir, arch, platform);

          pruneEmojiOne(versionedOutputDir, platform);

          // Zip it up.
          log("Zipping up the package");

          mv(path.join(versionedOutputDir, "LICENSE"), path.join(versionedOutputDir, "LICENSE_electron.txt"));
          cp("extraterm/README.md", versionedOutputDir);
          cp("extraterm/LICENSE.txt", versionedOutputDir);
          
          exec(`zip -y -r ${outputZip} ${versionedOutputDir}`);
          cd(thisCD);
          
          log("App bundle written to " + versionedOutputDir);
          resolve();
        }
      });
    });
  }
  
  function replaceDirs(targetDir, replacementsDir) {
    const prevDir = pwd();
    cd(srcRootDir);
    const replacements = ls(replacementsDir);
    replacements.forEach( (rDir) => {
      const targetSubDir = path.join(targetDir, rDir);
      if (test('-d', targetSubDir)) {
        rm('-r', targetSubDir);
      }
      cp('-r', path.join(replacementsDir, rDir), targetSubDir);
    });  
    cd(prevDir);
  }
  
  //replaceDirs(path.join(buildTmpPath, 'extraterm/node_modules'), 'build_scripts/node_modules-win32-x64');
  replaceDirs(path.join(buildTmpPath, 'extraterm/node_modules'), 'build_scripts/node_modules-linux-x64');
  makePackage('x64', 'linux')
    .then( () => { log("Done"); } );
  /*makePackage('x64', 'win32')
    .then( () => {
      replaceDirs(path.join(buildTmpPath, 'extraterm/node_modules'), 'build_scripts/node_modules-linux-x64');
      return makePackage('x64', 'linux'); })
    
    .then( () => {
      replaceDirs(path.join(buildTmpPath, 'extraterm/node_modules'), 'build_scripts/node_modules-linux-ia32');
      return makePackage('ia32', 'linux'); })
      
    .then( () => {
      replaceDirs(path.join(buildTmpPath, 'extraterm/node_modules'), 'build_scripts/node_modules-darwin-x64');
      return makePackage('x64', 'darwin'); })*/
}

main();
