Requirements
==============================================================

The Paragraphs Editor module supports Drupal version 8.x. There are currently
no plans to backport functionality to previous versions of Drupal. Of course,
you'll also need the paragraphs module.

Requirements for the CKEditor Integration
----------------------------------------------

Since CKEditor is supported directly in drupal core, you really only need the
following modules:

* paragraphs_editor
* paragraphs_ckeditor
* paragraphs
* entity_reference_revisions

All other dependencies are directly provided by Drupal core.

Requirements for Integration with Other Editors
-------------------------------------------------

The paragraphs_ckeditor module provides integration with the core CKEditor
implementation, but most of the functionality actually lies in the
paragraphs_editor module. This functionality can be reused for virtually any
editor that Drupal can support.

In order to provide support for additional editors, some development work is
required. In particular, an adapter must be written to translate ajax responses
into editor-specific interactions.

Though any editor should be adaptable in theory, there are a couple of
loost requirements that will allow the editor to map conceptually to the
paragraphs_editor structure:

* Editor should provide some type of "widget" mechanism that allows a glob of
  html to be managed as a uniquely identified model. For those familiar with
  CKEditor, this basically means anything that is analgous to CKEditor widgets.
  You can of course replicate this yourself on top of the editor, but that's
  likely to be a fair chunk of work.
* The ability to include a button for embedding new paragraph entities.
