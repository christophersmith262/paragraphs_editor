/**
 * @file
 *
 * A CKEDITOR Plugin for integrating with the paragraphs module.
 */

( function($) {
  "use strict";

  var ParagraphsCkeditorEntityPreviewTable = function(form_build_id) {
    var table = this;

    var ajaxFinished;
    var elements = [];
    var previews = [];


    this.reset = function() {
      ajaxFinished = false;

      $.ajax({
        url: '/admin/paragraphs-ckeditor/preview/' + form_build_id
      }).done(function(data) {
        ajaxFinished = true;
        var element;
        var entity_form_id;
        // Update the preview table.
        for (entity_form_id in data) {
          if (!previews[entity_form_id] && data[entity_form_id]) {
            table.set(entity_form_id, data[entity_form_id]);
          }
        } 
        // Update anything that was waiting for a preview.
        while (element = elements.pop()) {
          var entity_form_id = $(element).attr('entity-form-id');
          ParagraphsCkeditorTagPrototype.updateContent.call(element);
        }
      });
    }

    this.isReady = function() {
      return ajaxFinished;
    }

    this.registerElement = function(element) {
      elements.push(element);
    }

    this.set = function(entity_build_id, preview) {
      previews[entity_build_id] = preview;
    }

    this.get = function(entity_build_id) {
      if (previews[entity_build_id]) {
        return previews[entity_build_id];
      }
      else {
        return false;
      }
    }
  };

  var ParagraphsCkeditorEntityPreviews = {
    forms: [],

    getPreviews: function(form_build_id) {
      if (!this.forms[form_build_id]) {
        this.forms[form_build_id] = new ParagraphsCkeditorEntityPreviewTable(form_build_id);
      }
      return this.forms[form_build_id];
    }
  };

  /**
   * Provides a prototype object for creating a custom html tag.
   */
  var ParagraphsCkeditorTagPrototype = Object.create(HTMLElement.prototype);

  ParagraphsCkeditorTagPrototype.activeFormId = ''; 

  ParagraphsCkeditorTagPrototype.setActiveEditor = function(editor) {
    var $build_id = $(editor.element.$).closest('form').find('input[name="form_build_id"]');
    ParagraphsCkeditorTagPrototype.activeFormId = $build_id.attr('value');
  }

  ParagraphsCkeditorTagPrototype.createdCallback = function() {
    ParagraphsCkeditorTagPrototype.updateContent.call(this, $(this).attr('entity-form-id'));
  };

  ParagraphsCkeditorTagPrototype.updateContent = function(entity_form_id, preview) {
    if (!$(this).data('form-build-id')) {
      $(this).data('form-build-id', ParagraphsCkeditorTagPrototype.activeFormId);
    }

    var previews = ParagraphsCkeditorEntityPreviews.getPreviews($(this).data('form-build-id'));

    // Update the form id.
    if (entity_form_id) {
      $(this).attr('entity-form-id', entity_form_id);
    }
    else {
      entity_form_id = $(this).attr('entity-form-id');
    }

    // Update the preview table.
    var force = false;
    if (preview) {
      previews.set(entity_form_id, preview);
      force = true;
    }

    // Update the contents if preview exists, otherwise remove this element. We use
    // the shadow DOM if available to hide noisy HTML in the source editor.
    // Otherwise we expose the preview markup to the user, but any changes they
    // make to the preview will be wiped away as soon as they leave the source editor.
    if (previews.isReady()) {
      preview = previews.get(entity_form_id);
      if (preview) {
        if (this.createShadowRoot) {
          if (!this.shadowRoot) {
            this.createShadowRoot();
          }
          // Only update if this is a forced update or there is no current preview.
          if (!this.shadowRoot.innerHTML.length || force) {
            this.shadowRoot.innerHTML = preview +
              '<style>@import "/sites/all/themes/wgbhnews/css/ckeditor.css";</style>';
            this.shadowRoot.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
            });
          }
          this.innerHTML = '';
        }
        else {
          if (this.innerHTML == '...' || force) {
            this.innerHTML = preview;
            $('a', this).click(function(e) { e.stopPropogation(); e.preventDefault(); });
          }
        }
      }
      else {
        $(this).parent().remove();
      }
    }
    else {
      this.innerHTML = '...';
      previews.registerElement(this);
    }
  };

  /**
   * Provides a class for handling Modal events.
   */
  var ModalEventHandler = function(editor, mode, widget) {

    this.onBundleSelect = function(modal, event_name, bundle) {
      Drupal.ParagraphsExtra.Api.ParagraphsCkeditorEmbedModal.show(bundle, undefined);
    },

    this.onEmbedFormComplete = function(modal, event_name, form_id, rendered_entity) {
      var element;
      if (mode == 'embed') {
        element = new CKEDITOR.dom.element('paragraphs-ckeditor-paragraph');
        element.setAttribute('entity-form-id', form_id);
        editor.insertElement(element);
        editor.widgets.initOn(element, 'insertparagraphWidget');
        ParagraphsCkeditorTagPrototype.setActiveEditor(editor);
      }
      else {
        element = widget.element;
      }
      ParagraphsCkeditorTagPrototype.updateContent.call(element.$, form_id, rendered_entity);
    }
  }

  var showPragraphItemEditModal = function (widget) {
    var plugin = new ModalEventHandler(widget.editor, 'edit', widget);
    var entity_form_id = $(widget.element.$).attr('entity-form-id');
    Drupal.ParagraphsExtra.Api.ParagraphsCkeditorEmbedModal.setActivePlugin(plugin);
    Drupal.ParagraphsExtra.Api.ParagraphsCkeditorEmbedModal.show(undefined, entity_form_id); 
  }

  var showParagraphEmbedModal = function (editor) {
    var plugin = new ModalEventHandler(editor, 'embed', undefined);
    Drupal.ParagraphsExtra.Api.ParagraphsCkeditorEmbedModal.setActivePlugin(plugin);
    Drupal.ParagraphsExtra.Api.BundleSelectModal.setActivePlugin(plugin);
    Drupal.ParagraphsExtra.Api.BundleSelectModal.show();
  }

  // Register CKEDITOR plugin
  CKEDITOR.plugins.add( 'insertparagraph', {
    requires : [ "widget" ],
    beforeInit: function(editor) {
      // We need to register the paragraphs-ckeditor-paragraph element with the
      // CKEDITOR DOM model or it will get confused and add wayward <p> tags.
      // Here we will register the paragraphs-ckeditor-paragraph tag to behave
      // like a div tag.
      CKEDITOR.dtd['paragraphs-ckeditor-paragraph'] = CKEDITOR.dtd.div;
      for (var tagName in CKEDITOR.dtd) {
        if (CKEDITOR.dtd[tagName].div) {
          CKEDITOR.dtd[tagName]['paragraphs-ckeditor-paragraph'] = 1;
        }
      }
      CKEDITOR.dtd.body['paragraphs-ckeditor-paragraph'] = 1;
    },
    init : function (editor) {
      ParagraphsCkeditorTagPrototype.setActiveEditor(editor);
      ParagraphsCkeditorEntityPreviews.getPreviews(ParagraphsCkeditorTagPrototype.activeFormId).reset();

      // Try to use the web components 'registerElement' method if possible, but
      // fall back to manually calling the prototype's createdCallback method.
      editor.on('contentDom', function() {
        ParagraphsCkeditorTagPrototype.setActiveEditor(editor);
        try {
          editor.document.$.registerElement('paragraphs-ckeditor-paragraph', {
            prototype: ParagraphsCkeditorTagPrototype
          });
        }
        catch(e) {
          $('paragraphs-ckeditor-paragraph', editor.document.$).each(function() {
            ParagraphsCkeditorTagPrototype.createdCallback.call(this);
          });
        }
      });
      editor.on('change', function() {
        ParagraphsCkeditorTagPrototype.setActiveEditor(editor);
        $('paragraphs-ckeditor-paragraph', editor.document.$).each(function() {
          ParagraphsCkeditorTagPrototype.createdCallback.call(this);
        });
      });

      editor.on('beforeCommandExec', function(e) {
        var selection = editor.getSelection();
        if (selection) {
          var ranges = selection.getRanges();
        for (var i in ranges) {
          if (ranges[i].getBoundaryNodes) {
            if (searchBranch(ranges[i], 'paragraphs-ckeditor-paragraph')) {
              var undoable = true;
              if (typeof e.data.command.canUndo !== 'undefined') {
                undoable = e.data.command.canUndo;
              }
              if (undoable) {
                e.data = null;
                return false;
              }
            }
          }
        }
        }
      });

      function searchBranch(range, selector) {
        var common = range.getCommonAncestor().$;
        var boundaries = range.getBoundaryNodes();
        var in_range = false;

        var start = boundaries.startNode.$;
        var end = boundaries.endNode.$;

        while (start && start.parentNode !== common) {
          start = start.parentNode;
        }

        while (end && end.parentNode !== common) {
          end = end.parentNode;
        }

        var child;
        for (child = common.firstChild; child; child = child.nextSibling) {
          if (child === start) {
            in_range = true;
          }

          if (in_range && $(child).find(selector).length) {
            return true;
          }

          if (child === end) {
            break;
          }
        }

        return false;
      }

      editor.addCommand( 'insertparagraph', {
        allowedContent: 'paragraphs-ckeditor-paragraph[*]',
        requiredContent: 'paragraphs-ckeditor-paragraph[*]',
        exec: showParagraphEmbedModal
      });
      editor.ui.addButton( 'paragraphsInsertParagraph', {
        label: 'Embed',
        command: 'insertparagraph',
        toolbar: 'insert',
        icon: this.path + '/icons/insertparagraph.png',
      } );
      editor.widgets.add('insertparagraphWidget', {
        allowedContent: true,
        requiredContent: 'paragraphs-ckeditor-paragraph[*]',
        template: '<paragraphs-ckeditor-paragraph></paragraphs-ckeditor-paragraph>',
        upcast: function (element) {
          return element.name == 'paragraphs-ckeditor-paragraph';
        },
        init: function() {
          var widget = this;
          $(this.element.$).dblclick(function() {
            showPragraphItemEditModal(widget);
          });
        }
      });
    },
  } );

} )(jQuery);
