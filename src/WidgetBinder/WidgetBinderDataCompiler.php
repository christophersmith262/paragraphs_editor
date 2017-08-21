<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Render\Element;
use Drupal\Core\Render\RenderContext;
use Drupal\Core\Render\RendererInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;

/**
 * The default implementation of the widget binder data model compiler.
 */
class WidgetBinderDataCompiler implements WidgetBinderDataCompilerInterface {

  /**
   * The paragraph entity view builder.
   *
   * @var \Drupal\Core\Entity\EntityViewBuilderInterface
   */
  protected $viewBuilder;

  /**
   * The renderer service.
   *
   * @var \Drupal\Core\Render\RendererInterface
   */
  protected $renderer;

  /**
   * The paragraphs editor field value manager.
   *
   * @var \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface
   */
  protected $fieldValueManager;

  /**
   * The generator objects to run on compile.
   *
   * @var Drupal\paragraphs_editor\WidgetBinder[]
   */
  protected $generators = [];

  /**
   * Creates a WidgetBinderDataCompiler.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager service to get the paragraph view builder from.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer service for rendering the paragraph.
   * @param \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface $field_value_manager
   *   The field value manager service for reading paragraphs editor field
   *   information.
   *
   * @constructor
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager, RendererInterface $renderer, FieldValueManagerInterface $field_value_manager) {
    $this->viewBuilder = $entity_type_manager->getViewBuilder('paragraph');
    $this->renderer = $renderer;
    $this->fieldValueManager = $field_value_manager;
  }

  /**
   * {@inheritdoc}
   */
  public function addGenerator(GeneratorInterface $generator) {
    $this->generators[$generator->id()] = $generator;
  }

  /**
   * {@inheritdoc}
   */
  public function compile(CommandContextInterface $context, EditBufferItemInterface $item, $view_mode = 'full', $langcode = NULL) {
    $data = new WidgetBinderData();
    $state = new WidgetBinderDataCompilerState($this->generators, $data, $context, $item);
    $paragraph = $item->getEntity();
    $this->applyGenerators('initialize', $data, $state, $paragraph);
    $this->traverseParagraph($data, $state, $paragraph);

    // Attach the view builder that will decorate the view with information
    // needed to make nested paragraphs into nested editables.
    $render_context = new RenderContext();
    $view = $this->viewBuilder->view($paragraph, $view_mode, $langcode);
    $this->processElement($view, $state);

    // Render the rendered markup for the view and collect any bubbled
    // attachment information from the context.
    $renderer = $this->renderer;
    $markup = $renderer->executeInRenderContext($render_context, function () use ($renderer, $view) {
      return $renderer->render($view);
    });

    $this->applyGenerators('complete', $data, $state, $render_context, $markup);
    return $data;
  }

  /**
   * Pre-render callback for attaching the editor state to the render array.
   *
   * @param array $build
   *   The render array to operate on.
   *
   * @return array
   *   The updated render array with the attached state.
   */
  public function buildView(array $build) {
    $state = $build['#paragraphs_editor_state'];

    foreach (Element::children($build) as $field_name) {
      if (!empty($build[$field_name]['#items'])) {
        $items = $build[$field_name]['#items'];
        $field_definition = $items->getFieldDefinition();

        if ($this->fieldValueManager->isParagraphsField($field_definition)) {
          $this->processElement($build[$field_name], $state, FALSE);

          if (!$this->fieldValueManager->isParagraphsEditorField($field_definition)) {
            foreach (Element::children($build[$field_name]) as $delta) {
              $this->processElement($build[$field_name][$delta], $state);
            }
          }
        }
      }
    }

    return $build;
  }

  /**
   * Marks an element for editor state attachment.
   *
   * @param array &$element
   *   The element to attach the state to.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The state to attach.
   * @param bool $process_children
   *   TRUE if children should also be passed through the pre-render attachment
   *   processor, or if the state attachment should end at this render node.
   *   Defaults to TRUE.
   */
  protected function processElement(array &$element, WidgetBinderDataCompilerState $state, $process_children = TRUE) {
    $element['#paragraphs_editor_state'] = $state;
    if ($process_children) {
      $element['#pre_render'][] = [$this, 'buildView'];
    }
  }

  /**
   * Traverses the entire paragraph tree for a paragraph, applying generators.
   *
   * Each paragraph reference field is recursively followed so that the entire
   * tree below the paragraph is covered.
   *
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData $data
   *   The data being compiled.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState $state
   *   The current state of the compiler.
   * @param \Drupal\paragraphs\ParagraphInterface $paragraph
   *   The paragraph to traverse.
   */
  protected function traverseParagraph(WidgetBinderData $data, WidgetBinderDataCompilerState $state, ParagraphInterface $paragraph) {
    $this->applyGenerators('processParagraph', $data, $state, $paragraph);

    foreach ($paragraph->getFields() as $items) {
      $field_definition = $items->getFieldDefinition();
      if ($this->fieldValueManager->isParagraphsField($field_definition)) {
        $is_editor_field = $this->fieldValueManager->isParagraphsEditorField($field_definition);
        $this->applyGenerators('processField', $data, $state, $items, $is_editor_field);

        if (!$is_editor_field) {
          foreach ($this->fieldValueManager->getReferencedEntities($items) as $child_paragraph) {
            $this->traverseParagraph($data, $state, $child_paragraph);
          }
        }

        $this->applyGenerators('postprocessField', $data, $state, $items, $is_editor_field);
      }
    }

    $this->applyGenerators('postprocessParagraph', $data, $state, $paragraph);
  }

  /**
   * Runs the widget binder data generators.
   *
   * This function accepts a variable number of arguments. The first argument is
   * always the name of the method to invoke on the generator. The rest of the
   * arguments are passed through to the generator.
   */
  protected function applyGenerators() {
    $args = func_get_args();
    $method = array_shift($args);
    foreach ($this->generators as $generator) {
      call_user_func_array([$generator, $method], $args);
    }
  }

}
