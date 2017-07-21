<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\Plugin\dom_processor\SemanticAnalyzerInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorSemanticAnalyzer(
 *   id = "paragraphs_editor_paragraph_analyzer",
 *   label = "Paragraphs Editor Paragraph Analyzer"
 * )
 */
class ParagraphsEditorParagraphAnalyzer implements SemanticAnalyzerInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  protected $storage;
  protected $contextFactory;

  public function __construct($field_value_manager, array $elements, $entity_type_manager, $context_factory) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager, $elements);
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->contextFactory = $context_factory;
  }

  /**
   * {@inheritdoc}
   */
  public function analyze(SemanticDataInterface $data) {
    if ($data->is($this->getSelector('widget'))) {
      return $this->analyzeWidget($data);
    }
    else if ($data->is($this->getSelector('field'))) {
      return $this->analyzeField($data);
    }
    else {
      return $data;
    }
  }

  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->getParameter('paragraphs_editor.field_value.elements'),
      $container->get('entity_type.manager'),
      $container->get('paragraphs_editor.command.context_factory')
    );
  }

  protected function analyzeWidget(SemanticDataInterface $data) {
    $entity = NULL;
    $uuid = $this->getAttribute($data, 'widget', '<uuid>');
    $context_id = $this->getAttribute($data, 'widget', '<context>');

    if (!$uuid) {
      throw new DomProcessorError("Reference to empty UUID discarded.");
    }

    // If there is a context id provided, try to get the paragraph from the
    // context.
    if ($context_id) {
      $field_context_id = $data->get('field.context_id');

      if ($context_id != $field_context_id) {
        $context_id = $node->set('paragraph.context_id', $field_context_id);
        throw new DomProcessorWarning("Corrected faulty context id.");
      }

      try {
        $context = $this->contextFactory->get($context_id);
        $edit_buffer = $context->getEditBuffer();
        $entity = $edit_buffer->getItem($uuid)->getEntity();
      }
      catch (\Exception $e) {
        throw new DomProcessorError("Could not load entity from context.");
      }
    }

    // If we are currently within a paragraph field try to get the entity from
    // the field.
    else if ($data->has('field.instance')) {
      foreach ($data->get('field.instance')->referencedEntities() as $entity_candidate) {
        if ($entity_candidate->uuid() == $uuid) {
          $entity = $entity_candidate;
          break;
        }
      }
    }

    // Otherwise try to laod the entity from the database.
    else {
      $entity = $this->storage->load($uuid);
    }

    // Fail if we couldn't load the entity from anywhere.
    if (!$entity) {
      throw new DomProcessorError("Could not load entity.");
    }

    return $data->tag('paragraph', [
      'entity' => $entity,
      'context_id' => $context_id,
    ]);
  }

  protected function analyzeField(SemanticDataInterface $data) {
    $field_name = $this->getAttribute($data, 'field', '<name>');
    $is_mutable = filter_var($this->getAttribute($data, 'field', '<editable>'), FILTER_VALIDATE_BOOLEAN);
    $context_id = $this->getAttribute($data, 'field', '<context>');

    if (!$field_name) {
      throw new DomProcessorError("Field name missing.");
    }

    if (!$data->has('paragraph.entity')) {
      throw new DomProcessorError("Cannot access field value without an entity.");
    }

    $paragraph = $data->get('paragraph.entity');
    if (!isset($paragraph->{$field_name})) {
      throw new DomProcessorError("Could not access field on entity.");
    }

    $field = $paragraph->{$field_name};
    $field_definition = $field->getFieldDefinition();
    if (!static::isParagraphsField($field_definition)) {
      throw new DomProcessorError("Attempted to access non-paragraphs field.");
    }

    if ($is_mutable && !self::isApplicable($field_definition)) {
      throw new DomProcessorError("Edits defined for a non-editable field.");
    }

    $field_value_wrapper = $is_mutable ? $this->fieldValueManager->wrap($field, []) : NULL;
       
    return $data->tag('field', [
      'instance' => $field,
      'context_id' => $context_id,
      'is_mutable' => $is_mutable,
      'wrapper' => $field_value_wrapper,
    ]);
  }
}

