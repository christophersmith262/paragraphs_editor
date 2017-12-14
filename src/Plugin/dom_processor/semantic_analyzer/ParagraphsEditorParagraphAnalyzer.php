<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer;

use Drupal\Core\Entity\EntityStorageInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorError;
use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\Plugin\dom_processor\SemanticAnalyzerInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Drupal\paragraphs_editor\EditorFieldValue\ParagraphsEditorElementTrait;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * An analyzer plugin for extracting paragraphs editor data from a DOM tree.
 *
 * The paragraph analyzer will first look to see if there is an edit context for
 * a paragraph, and will try to load the paragraph from that context's edit
 * buffer if available.
 *
 * If no edits exist in the edit buffer for the context, the analyzer will
 * attempt to load the paragraph from the field items that the paragraph is
 * nested within.
 *
 * If the entity cannot be found in either of those locations, it is loaded from
 * through the entity storage system.
 *
 * @DomProcessorSemanticAnalyzer(
 *   id = "paragraphs_editor_paragraph_analyzer",
 *   label = "Paragraphs Editor Paragraph Analyzer"
 * )
 */
class ParagraphsEditorParagraphAnalyzer implements SemanticAnalyzerInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorElementTrait;

  /**
   * The paragraph storage handler.
   *
   * @var \Drupal\Core\Entity\EntityStorageInterface
   */
  protected $storage;

  /**
   * The context factory to get contexts for loading unsaved edits.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface
   */
  protected $contextFactory;

  /**
   * Creates a paragraph analyzer plugin.
   *
   * @param \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface $field_value_manager
   *   The field value manager service to initialize the element trait.
   * @param \Drupal\Core\Entity\EntityStorageInterface $storage
   *   The paragraph storage handler for loading otherwise unresolvable
   *   entities.
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface $context_factory
   *   The context factory to use for looking up unsaved entity edits.
   */
  public function __construct(FieldValueManagerInterface $field_value_manager, EntityStorageInterface $storage, CommandContextFactoryInterface $context_factory) {
    $this->initializeParagraphsEditorElementTrait($field_value_manager);
    $this->storage = $storage;
    $this->contextFactory = $context_factory;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->get('entity_type.manager')->getStorage('paragraph'),
      $container->get('paragraphs_editor.command.context_factory')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function analyze(SemanticDataInterface $data) {
    if ($data->is($this->getSelector('widget'))) {
      return $this->analyzeWidget($data);
    }
    elseif ($data->is($this->getSelector('field'))) {
      return $this->analyzeField($data);
    }
    else {
      return $data;
    }
  }

  /**
   * Analyzes a widget DOM element to produce semantic data.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current data state for the analyzer.
   *
   * @return \Drupal\dom_processor\DomProcessor\SemanticDataInterface
   *   The updated data state for the processor decorated with information about
   *   the referenced paragraph.
   */
  protected function analyzeWidget(SemanticDataInterface $data) {
    $uuid = $this->getAttribute($data->node(), 'widget', '<uuid>');

    // Try to load the entity from it's hinted context first, then try the
    // context for the field it belongs to, then try to locate the item in the
    // field items of the field it belongs to, and if all else fails, try to
    // load the entity from the database.
    $attempts = [
      [
        'type' => 'context',
        'context_id' => $this->getAttribute($data->node(), 'widget', '<context>'),
      ],
      [
        'type' => 'context',
        'context_id' => $data->get('field.context_id'),
      ],
      [
        'type' => 'items',
        'items' => $data->get('field.items'),
      ],
      [
        'type' => 'storage',
      ],
    ];

    while (!empty($attempts)) {
      $attempt = array_shift($attempts);
      try {
        if ($attempt['type'] == 'context') {
          $context = $this->contextFactory->get($attempt['context_id']);
          if (!empty($context)) {
            $edit_buffer = $context->getEditBuffer();
            $item = $edit_buffer->getItem($uuid);
            if ($item) {
              return $data->tag('paragraph', [
                'entity' => $item->getEntity(),
                'context_id' => $attempt['context_id'],
              ]);
            }
          }
        }
        elseif ($attempt['type'] == 'items' && $attempt['items']) {
          foreach ($this->fieldValueManager->getReferencedEntities($attempt['items']) as $candidate) {
            if ($candidate->uuid() == $uuid) {
              return $data->tag('paragraph', [
                'entity' => $candidate,
              ]);
            }
          }
        }
        elseif ($attempt['type'] == 'storage') {
          $matches = $this->storage->loadByProperties([
            'uuid' => $uuid,
          ]);
          if (!empty($matches)) {
            return $data->tag('paragraph', [
              'entity' => reset($matches),
            ]);
          }
        }
      }
      catch (\Exception $e) {
        throw new DomProcessorError("Unkown load type.");
      }
    }

    throw new DomProcessorError("Could not load entity.");
  }

  /**
   * Analyzes a field DOM element to produce semantic data.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The current data state for the analyzer.
   *
   * @return \Drupal\dom_processor\DomProcessor\SemanticDataInterface
   *   The updated data state for the processor decorated with information about
   *   the referenced field.
   */
  protected function analyzeField(SemanticDataInterface $data) {
    $field_name = $this->getAttribute($data->node(), 'field', '<name>');
    $paragraph = $data->get('paragraph.entity');
    if (!$field_name || !$paragraph || !isset($paragraph->{$field_name})) {
      throw new DomProcessorError("Could not access field on entity.");
    }

    $items = $paragraph->{$field_name};
    $field_definition = $items->getFieldDefinition();
    if (!$this->fieldValueManager->isParagraphsField($field_definition)) {
      throw new DomProcessorError("Attempted to access non-paragraphs field.");
    }

    if ($this->fieldValueManager->isParagraphsEditorField($field_definition)) {
      $field_value_wrapper = $this->fieldValueManager->wrapItems($items);
      $context_id = $this->getAttribute($data->node(), 'field', '<context>');
    }
    else {
      $context_id = NULL;
      $field_value_wrapper = NULL;
    }

    return $data->tag('field', [
      'items' => $items,
      'context_id' => $context_id,
      'wrapper' => $field_value_wrapper,
    ]);
  }

}
