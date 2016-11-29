Delivery Provider Plugins
==============================================================

If you're looking to get up and running with the CKEditor integration, skip to
the paragraphs_ckeditor section.

What does this module provide Out-of-the-box?
----------------------------------------------

The Paragraphs Editor module mainly consists of an API that developers can use
to enable paragraphs integration for arbitrary text editors. It also provides
the requisite core Drupal plugins for editing and displaying paragraph fields
as HTML content.

* A field widget plugin that wraps the paragraph field in a text editor.
* A field formatter plugin that renders the paragraph field as an HTML
  document.
* A text filter that converts paragraph embed codes into rendered paragaph
  entities.

The paragraphs_ckeditor module is an adapter that provides ckeditor
integration with the CKEditor implementation in Drupal Core.

What APIs does this module expose?
----------------------------------------------

* An adapter layer for integrating with other editors.
* A plugin layer for implementing different mechanisms for selecting paragraph
  bundles.
* A plugin layer for implementing different behaviors for displaying paragraphs
  editor forms.
