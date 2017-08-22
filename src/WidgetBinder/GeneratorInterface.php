<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

use Drupal\Core\Render\RenderContext;
use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\paragraphs\ParagraphInterface;

/**
 * An interface for widget binder data generators.
 *
 * Generators are responsible for producing compiled widget binder models that
 * will be sent to the client. They can also generate other temporary data for
 * rendering that can be accessed through the compiler state. In general, each
 * generator should be responsible for generating one type of model or render
 * helper object.
 */
interface GeneratorInterface {

  /**
   * Provides a unique id for the generator.
   *
   * The id should be a single word string, preferably specifying the type of
   * model or object it generates.
   */
  public function id();

  /**
   * Initializes the generator before any processing has taken place.
   *
   * This should be used to prime the compiler state to prepare for generation.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The compiled data to add models to.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The compiler state to be initialized.
   * @param \Drupal\paragraphs\ParagraphInterface $paragraph
   *   The paragraph being compiled.
   */
  public function initialize(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $paragraph);

  /**
   * Visits a paragraph in the content tree.
   *
   * This is called before rendering for each paragraph, and recursively for
   * each child paragraph. Paragraphs are processed top-down.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The compiled data to add models to.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The compiler state.
   * @param \Drupal\paragraphs\ParagraphInterface $paragraph
   *   The paragraph to process.
   */
  public function processParagraph(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $paragraph);

  /**
   * Visits a paragraph field in the content tree.
   *
   * This is called before rendering for each paragraph entity reference field,
   * and recursively for each child field. Fields are processed top-down.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The compiled data to add models to.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The compiler state.
   * @param \Drupal\Core\Field\EntityReferenceFieldItemListInterface $items
   *   The field items to process.
   * @param bool $is_editor_field
   *   TRUE if this is a paragraphs editor field, FALSE if this is a plain
   *   paragraphs field.
   */
  public function processField(WidgetBinderData $data, WidgetBinderDataCompilerState $state, EntityReferenceFieldItemListInterface $items, $is_editor_field);

  /**
   * Visits a paragraph in the content tree.
   *
   * This is called before rendering for each paragraph, and recursively for
   * each child paragraph. Paragraphs are processed bottom-up.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The compiled data to add models to.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The compiler state.
   * @param \Drupal\paragraphs\ParagraphInterface $paragraph
   *   The paragraph to process.
   */
  public function postprocessParagraph(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $paragraph);

  /**
   * Visits a paragraph field in the content tree.
   *
   * This is called before rendering for each paragraph entity reference field,
   * and recursively for each child field. Fields are processed bottom-up.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The compiled data to add models to.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The compiler state.
   * @param \Drupal\Core\Field\EntityReferenceFieldItemListInterface $items
   *   The field items to process.
   * @param bool $is_editor_field
   *   TRUE if this is a paragraphs editor field, FALSE if this is a plain
   *   paragraphs field.
   */
  public function postprocessField(WidgetBinderData $data, WidgetBinderDataCompilerState $state, EntityReferenceFieldItemListInterface $items, $is_editor_field);

  /**
   * Called after a compiler finishes with the rendered markup.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The compiled data to add models to.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The compiler state.
   * @param Drupal\Core\Render\RenderContext $render_context
   *   The Drupal render context containing the bubbled metadata for the
   *   rendered item.
   * @param string $markup
   *   The rendered markup for the item.
   */
  public function complete(WidgetBinderData $data, WidgetBinderDataCompilerState $state, RenderContext $render_context, $markup);

}
