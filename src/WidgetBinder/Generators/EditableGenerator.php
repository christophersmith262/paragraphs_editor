<?php

namespace Drupal\paragraphs_editor\WidgetBinder\Generators;

use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Render\Markup;
use Drupal\dom_processor\DomProcessor\DomProcessorInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_editor\ParagraphsEditorElements;
use Drupal\paragraphs_editor\Utility\TypeUtility;
use Drupal\paragraphs_editor\WidgetBinder\EditableField;
use Drupal\paragraphs_editor\WidgetBinder\GeneratorBase;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;

/**
 * Generates EditableField objects for an EditBufferItem.
 */
class EditableGenerator extends GeneratorBase {

  /**
   * The field value manager service for looking up element information.
   *
   * @var \Drupal\paragraphs_editor\ParagraphsEditorElements
   */
  protected $elements;

  /**
   * The dom processor service for creating inline markup.
   *
   * @var \Drupal\dom_processor\DomProcessor\DomProcessorInterface
   */
  protected $domProcessor;

  /**
   * Creates an EditableGenerator object.
   *
   * @param \Drupal\paragraphs_editor\ParagraphsEditorElements $elements
   *   The service for looking up element information.
   * @param \Drupal\dom_processor\DomProcessor\DomProcessorInterface $dom_processor
   *   The Dom processor for generating inline markup.
   */
  public function __construct(ParagraphsEditorElements $elements, DomProcessorInterface $dom_processor) {
    $this->elements = $elements;
    $this->domProcessor = $dom_processor;
    $this->validateElements();
  }

  /**
   * {@inheritdoc}
   */
  public function id() {
    return 'editable';
  }

  /**
   * {@inheritdoc}
   */
  public function initialize(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $root_paragraph) {
    $state->set('editables', []);
  }

  /**
   * {@inheritdoc}
   */
  public function processField(WidgetBinderData $data, WidgetBinderDataCompilerState $state, EntityReferenceFieldItemListInterface $items, $is_editor_field) {
    $field_config = TypeUtility::ensureFieldConfig($items->getFieldDefinition());
    $context_id = $data->getContextId($items->getEntity()->uuid(), $field_config->id());
    if ($context_id) {
      if ($items->isEmpty()) {
        $items->setValue(['entity' => \Drupal::entityTypeManager()->getStorage('paragraphs_markup')->create([])]);
      }

      // Prepare the inline field editable markup.
      $markup = $items->entity->getMarkup();
      $markup = $this->domProcessor->process($markup, 'paragraphs_editor', 'decorator', ['context_id' => $context_id])->get('markup');
      $markup = Markup::create($markup);

      // Create a EditableField object for this field.
      $context_generator = $state->getGenerator('context');
      if (!$context_generator instanceof ContextGenerator) {
        throw new \Exception("Could not locate context generator.");
      }
      $context = $context_generator->getContext($context_id);
      $attributes = [
        'class' => [$this->elements->getElement('field')['flag']],
        $this->elements->getAttributeName('field', '<context>') => $context_id,
      ];
      $editable = $this->createEditable($context, $markup, $attributes);

      // Save the editable in a field mapped state entry.
      $editables = $state->get('editables');
      $editables[$items->getEntity()->uuid()][$field_config->id()] = $editable;
      $state->set('editables', $editables);
    }
  }

  /**
   * Provides a public getter for editable object lookup.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The compiler state to lookup the editable in.
   * @param \Drupal\Core\Field\FieldItemListInterface $items
   *   The field items to lookup the editable metadata for.
   *
   * @return \Drupal\paragraphs_editor\WidgetBinder\EditableField
   *   The editable metadata object for the field or NULL if no such object
   *   existed.
   */
  public function getEditable(WidgetBinderDataCompilerState $state, FieldItemListInterface $items) {
    $field_definition = $items->getFieldDefinition();
    if (TypeUtility::isParagraphsEditorField($field_definition)) {
      $uuid = $items->getEntity()->uuid();
      $field_id = TypeUtility::ensureFieldConfig($field_definition)->id();
      $editables = $state->get('editables');
      return !empty($editables[$uuid][$field_id]) ? $editables[$uuid][$field_id] : NULL;
    }
  }

  /**
   * Factory method for creating editables.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context that will contain edits to the editable field.
   * @param string $markup
   *   The editor markup to display inside the editable.
   * @param array $attributes
   *   The attributes to attach to inline editable.
   *
   * @return \Drupal\paragraphs_editor\WidgetBinder\EditableField
   *   The created EditableField object.
   */
  protected function createEditable(CommandContextInterface $context, $markup, array $attributes) {
    return new EditableField($context, $markup, $attributes);
  }

  /**
   * Makes sure the field element can handle editables.
   *
   * @throw \Exception
   *   Indicates the element configuration passed to the field value manager
   *   service is invalid for use in this generator because the 'flag' key is
   *   not in the 'field' element definition.
   */
  protected function validateElements() {
    if (empty($this->elements->getElement('field')['flag'])) {
      throw new \Exception('Invalid elements array: elements.field.tag required.');
    }
  }

}
