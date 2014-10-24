/**
 * Gruntfile
 *
 * If you created your Sails app with `sails new foo --linker`,
 * the following files will be automatically injected (in order)
 * into the EJS and HTML files in your `views` and `assets` folders.
 *
 * At the top part of this file, you'll find a few of the most commonly
 * configured options, but Sails' integration with Grunt is also fully
 * customizable.  If you'd like to work with your assets differently
 * you can change this file to do anything you like!
 *
 * More information on using Grunt to work with static assets:
 * http://gruntjs.com/configuring-tasks
 */

var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec;

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-jsonlint');

  /**
   * CSS files to inject in order
   * (uses Grunt-style wildcard/glob/splat expressions)
   *
   * By default, Sails also supports LESS in development and production.
   * To use SASS/SCSS, Stylus, etc., edit the `sails-linker:devStyles` task
   * below for more options.  For this to work, you may need to install new
   * dependencies, e.g. `npm install grunt-contrib-sass`
   */

  var cssFilesToInject = [
    'linker/**/*.css'
  ];


  /**
   * Javascript files to inject in order
   * (uses Grunt-style wildcard/glob/splat expressions)
   *
   * To use client-side CoffeeScript, TypeScript, etc., edit the
   * `sails-linker:devJs` task below for more options.
   */

  var jsFilesToInject = [

    // Below, as a demonstration, you'll see the built-in dependencies
    // linked in the proper order order

    // Bring in the socket.io client
    'linker/js/socket.io.js',

    // then beef it up with some convenience logic for talking to Sails.js
    'linker/js/sails.io.js',

    // A simpler boilerplate library for getting you up and running w/ an
    // automatic listener for incoming messages from Socket.io.
    'linker/js/app.js',

    // Include all javascript files in js and subdirectories
    'linker/js/backbone/**/*.js'
  ];


  /**
   * Client-side HTML templates are injected using the sources below
   * The ordering of these templates shouldn't matter.
   * (uses Grunt-style wildcard/glob/splat expressions)
   *
   * By default, Sails uses JST templates and precompiles them into
   * functions for you.  If you want to use jade, handlebars, dust, etc.,
   * edit the relevant sections below.
   */

  var templateFilesToInject = [
    'linker/**/*.html'
  ];



  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  //
  // DANGER:
  //
  // With great power comes great responsibility.
  //
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////

  // Modify css file injection paths to use
  cssFilesToInject = cssFilesToInject.map(function (path) {
    return '.tmp/public/' + path;
  });

  // Modify js file injection paths to use
  jsFilesToInject = jsFilesToInject.map(function (path) {
    return '.tmp/public/' + path;
  });


  templateFilesToInject = templateFilesToInject.map(function (path) {
    return 'assets/' + path;
  });


  // Get path to core grunt dependencies from Sails
  var depsPath = grunt.option('gdsrc') || 'node_modules/sails/node_modules';
  grunt.loadTasks(depsPath + '/grunt-contrib-clean/tasks');
  grunt.loadTasks(depsPath + '/grunt-contrib-copy/tasks');
  grunt.loadTasks(depsPath + '/grunt-contrib-concat/tasks');
  grunt.loadTasks(depsPath + '/grunt-sails-linker/tasks');
  grunt.loadTasks(depsPath + '/grunt-contrib-jst/tasks');
  grunt.loadTasks(depsPath + '/grunt-contrib-watch/tasks');
  grunt.loadTasks(depsPath + '/grunt-contrib-uglify/tasks');
  // grunt.loadTasks(depsPath + '/grunt-contrib-cssmin/tasks');
  grunt.loadTasks(depsPath + '/grunt-contrib-less/tasks');

  grunt.initConfig({

    requirejs: {
      compile: {
        options: {
          name: 'app',
          baseUrl: "assets/js/backbone/app",
          mainConfigFile: "assets/js/backbone/config/require_config.js",
          out: "assets/prod/js/midas-<%= pkg.version %>.js",
          paths: {
            requireLib: "../../vendor/require"
          },
          include: "requireLib"
        }
      }
    },

    cssmin: {
      combine: {
        files: {
          'assets/prod/css/midas-<%= pkg.version %>.css': [
            'assets/styles/bootstrap.css',
            'assets/styles/font-awesome/css/font-awesome.min.css',
            'assets/styles/font-custom/css/style.css',
            'assets/js/vendor/bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.css',
            'assets/js/vendor/jquery-timepicker/jquery.timepicker.css',
            'assets/js/vendor/jquery-file-upload/css/jquery.fileupload.css',
            'assets/js/vendor/select2/select2.css',
            'assets/styles/application.css',
            'assets/styles/theme.css'
          ]
        },
        options: {
          report: 'min'
        }
      },
      minify: {
        expand: true,
        cwd: 'assets/prod/css/',
        src: ['*.css', '!*.min.css'],
        dest: 'assets/prod/css/',
        ext: '.min.css',
        extDot: 'last',
        options: {
          report: 'min'
        }
      }
    },

    pkg: grunt.file.readJSON('package.json'),

    copy: {
      dev: {
        files: [
          {
          expand: true,
          cwd: './assets',
          src: ['**/*'],
          dest: '.tmp/public'
        }
        ]
      },
      build: {
        files: [
          {
          expand: true,
          cwd: '.tmp/public',
          src: ['**/*'],
          dest: 'www'
        }
        ]
      },
      prod: {
        files: [
        {
          expand: true,
          cwd: './assets',
          src: ['prod/**/*', 'js/vendor/**/*', 'images/**/*','locales/**/*'],
          dest: '.tmp/public'
        }
        ]
      },
      font: {
        files: [
        {
          expand: true,
          flatten: true,
          cwd: './assets',
          src: ['styles/font-awesome/fonts/*'],
          dest: 'assets/prod/fonts'
        },
        {
          expand: true,
          flatten: true,
          cwd: './assets',
          src: ['styles/font-custom/fonts/*'],
          dest: 'assets/prod/fonts'
        },
        {
          expand: true,
          flatten: true,
          cwd: './assets',
          src: ['fonts/*'],
          dest: 'assets/prod/fonts'
        }
        ]
      }
    },

    clean: {
      dev: ['.tmp/public/**'],
      prod: ['.tmp/public/**'],
      build: ['www']
    },

    jst: {
      dev: {
        options: {
          templateSettings: {
            interpolate: /\{\{(.+?)\}\}/g
          }
        },
        files: {
          '.tmp/public/jst.js': templateFilesToInject
        }
      }
    },

    less: {
      dev: {
        files: [
          {
          expand: true,
          cwd: 'assets/styles/',
          src: ['*.less'],
          dest: '.tmp/public/styles/',
          ext: '.css'
        }, {
          expand: true,
          cwd: 'assets/linker/styles/',
          src: ['*.less'],
          dest: '.tmp/public/linker/styles/',
          ext: '.css'
        }
        ]
      }
    },

    concat: {
      js: {
        src: jsFilesToInject,
        dest: '.tmp/public/concat/production.js'
      },
      css: {
        src: cssFilesToInject,
        dest: '.tmp/public/concat/production.css'
      }
    },

    uglify: {
      dist: {
        src: ['.tmp/public/concat/production.js'],
        dest: '.tmp/public/min/production.js'
      }
    },

    // cssmin: {
    //   dist: {
    //     src: ['.tmp/public/concat/production.css'],
    //     dest: '.tmp/public/min/production.css'
    //   }
    // },

    'sails-linker': {

      devJs: {
        options: {
          startTag: '<!--SCRIPTS-->',
          endTag: '<!--SCRIPTS END-->',
          fileTmpl: '<script src="%s"></script>',
          appRoot: '.tmp/public'
        },
        files: {
          '.tmp/public/**/*.html': jsFilesToInject,
          'views/**/*.html': jsFilesToInject,
          'views/**/*.ejs': jsFilesToInject
        }
      },

      prodJs: {
        options: {
          startTag: '<!--SCRIPTS-->',
          endTag: '<!--SCRIPTS END-->',
          fileTmpl: '<script src="%s"></script>',
          appRoot: '.tmp/public'
        },
        files: {
          '.tmp/public/**/*.html': ['.tmp/public/min/production.js'],
          'views/**/*.html': ['.tmp/public/min/production.js'],
          'views/**/*.ejs': ['.tmp/public/min/production.js']
        }
      },

      devStyles: {
        options: {
          startTag: '<!--STYLES-->',
          endTag: '<!--STYLES END-->',
          fileTmpl: '<link rel="stylesheet" href="%s">',
          appRoot: '.tmp/public'
        },

        // cssFilesToInject defined up top
        files: {
          '.tmp/public/**/*.html': cssFilesToInject,
          'views/**/*.html': cssFilesToInject,
          'views/**/*.ejs': cssFilesToInject
        }
      },

      prodStyles: {
        options: {
          startTag: '<!--STYLES-->',
          endTag: '<!--STYLES END-->',
          fileTmpl: '<link rel="stylesheet" href="%s">',
          appRoot: '.tmp/public'
        },
        files: {
          '.tmp/public/index.html': ['.tmp/public/min/production.css'],
          'views/**/*.html': ['.tmp/public/min/production.css'],
          'views/**/*.ejs': ['.tmp/public/min/production.css']
        }
      },

      // Bring in JST template object
      devTpl: {
        options: {
          startTag: '<!--TEMPLATES-->',
          endTag: '<!--TEMPLATES END-->',
          fileTmpl: '<script type="text/javascript" src="%s"></script>',
          appRoot: '.tmp/public'
        },
        files: {
          '.tmp/public/index.html': ['.tmp/public/jst.js'],
          'views/**/*.html': ['.tmp/public/jst.js'],
          'views/**/*.ejs': ['.tmp/public/jst.js']
        }
      },


      /*******************************************
       * Jade linkers (TODO: clean this up)
       *******************************************/

      devJsJADE: {
        options: {
          startTag: '// SCRIPTS',
          endTag: '// SCRIPTS END',
          fileTmpl: 'script(type="text/javascript", src="%s")',
          appRoot: '.tmp/public'
        },
        files: {
          'views/**/*.jade': jsFilesToInject
        }
      },

      prodJsJADE: {
        options: {
          startTag: '// SCRIPTS',
          endTag: '// SCRIPTS END',
          fileTmpl: 'script(type="text/javascript", src="%s")',
          appRoot: '.tmp/public'
        },
        files: {
          'views/**/*.jade': ['.tmp/public/min/production.js']
        }
      },

      devStylesJADE: {
        options: {
          startTag: '// STYLES',
          endTag: '// STYLES END',
          fileTmpl: 'link(rel="stylesheet", href="%s")',
          appRoot: '.tmp/public'
        },
        files: {
          'views/**/*.jade': cssFilesToInject
        }
      },

      prodStylesJADE: {
        options: {
          startTag: '// STYLES',
          endTag: '// STYLES END',
          fileTmpl: 'link(rel="stylesheet", href="%s")',
          appRoot: '.tmp/public'
        },
        files: {
          'views/**/*.jade': ['.tmp/public/min/production.css']
        }
      },

      // Bring in JST template object
      devTplJADE: {
        options: {
          startTag: '// TEMPLATES',
          endTag: '// TEMPLATES END',
          fileTmpl: 'script(type="text/javascript", src="%s")',
          appRoot: '.tmp/public'
        },
        files: {
          'views/**/*.jade': ['.tmp/public/jst.js']
        }
      }
      /************************************
       * Jade linker end
       ************************************/
    },

    jsonlint : {
      sample: {
        src:['assets/locales/**/*.json']
      }
    },

    watch: {
      api: {

        // API files to watch:
        files: ['api/**/*']
      },
      assets: {

        // Assets to watch:
        files: ['assets/**/*'],

        // When assets are changed:
        tasks: ['compileAssets', 'linkAssets']
      }
    }
  });

  // When Sails is lifted:
  grunt.registerTask('default', [
    'compileAssets',
    'linkAssets',
    'watch'
  ]);

  grunt.registerTask('compileAssets', [
    'clean:dev',
    'jst:dev',
    'less:dev',
    'copy:dev',
    'jsonlint'
  ]);

  grunt.registerTask('linkAssets', [

    // Update link/script/template references in `assets` index.html
    'sails-linker:devJs',
    'sails-linker:devStyles',
    'sails-linker:devTpl',
    'sails-linker:devJsJADE',
    'sails-linker:devStylesJADE',
    'sails-linker:devTplJADE'
  ]);

  // Build the production files
  grunt.registerTask('build', [
    // compile the js
    'requirejs',
    // Check validity of JSON files.
    'jsonlint',
    // compile the css
    'cssmin',
    // copy fonts
    'copy:font'
  ]);

  // When sails is lifted in production
  // clean and only copy the production files
  grunt.registerTask('prod', [
    'clean:prod',
    'copy:prod'
  ]);

  grunt.registerTask('initTags', 'load tag data', function() {
    var done = this.async();
    var toolPath = "tools/tagtool";
    fs.readdir(toolPath, function (err, files) {
      if (err) {
          throw err;
      }
      files.map(function (file) {
          return path.join(toolPath, file);
      }).filter(function (file) {
          return fs.statSync(file).isFile() &&
                 path.extname(file) === ('.txt');
      }).forEach(function (file) {
          var cmd = 'node ' + toolPath + '/tagtool.js ' + path.basename(file, '.txt') + ' ' +  file;
          grunt.log.write('Adding tags from ' + file).ok();
          exec(cmd);
      });
      done();
    });
  });
};
