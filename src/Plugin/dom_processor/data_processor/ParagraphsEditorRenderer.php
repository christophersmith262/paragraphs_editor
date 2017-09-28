<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

use Drupal\Core\Entity\EntityViewBuilderInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Drupal\paragraphs_editor\EditorFieldValue\ParagraphsEditorElementTrait;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * A DOM processor plugin for rendering embedded paragraphs.
 *
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_renderer",
 *   label = "Paragraphs Editor Renderer"
 * )
 */
class ParagraphsEditorRenderer implements DataProcessorInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorElementTrait;

  /**
   * The paragraph entity view builder.
   *
   * @var \Drupal\Core\Entity\EntityViewBuilderInterface
   */
  protected $viewBuilder;

  /**
   * The renderer service for rendering paragraph views.
   *
   * @var \Drupal\Core\Render\RendererInterface
   */
  protected $renderer;

  /**
   * Creates a paragraph renderer plugin.
   *
   * @param \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface $field_value_manager
   *   The field value manager service to initialize the element trait.
   * @param \Drupal\Core\Entity\EntityViewBuilderInterface $view_builder
   *   The view builder that will create render arrays for paragraphs that need
   *   to be rendered.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer service for rendering pargraph entities.
   */
  public function __construct(FieldValueManagerInterface $field_value_manager, EntityViewBuilderInterface $view_builder, RendererInterface $renderer) {
    $this->initializeParagraphsEditorElementTrait($field_value_manager);
    $this->viewBuilder = $view_builder;
    $this->renderer = $renderer;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->get('entity_type.manager')->getViewBuilder('paragraph'),
      $container->get('renderer')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($data->is($this->getSelector('widget'))) {
      $entity = $data->get('paragraph.entity');
      if ($entity) {
        $markup = $this->render($data, $entity);
        $result->replaceWithHtml($data, $markup);
        return $result;
      }
    }
    return $result;
  }

  /**
   * An internal utility function for rendering paragraphs.
   *
   * Since paragraphs editor fields are saved with the contents of their
   * embedded paragraphs completely removed, calling render on the first entity
   * process triggers a render on each child entity, and this behavior recurses
   * down the tree.
   *
   * This render wrapper function eliminates these recursive renders by
   * rendering the leaves of the tree first, caching the result, then working
   * its way up the tree to render each level until it hits the top, thus
   * avoiding deeply recursive rendering.
   *
   * @param \Drupal\dom_processor\DomProcessor\SemanticDataInterface $data
   *   The semantic data containing information about the paragraph to be
   *   rendered.
   * @param \Drupal\paragraphs\ParagraphInterface $entity
   *   The paragraph to be rendered.
   *
   * @return string
   *   The rendered markup for the entity.
   */
  protected function render(SemanticDataInterface $data, ParagraphInterface $entity) {
    $render_cache = &drupal_static(__CLASS__ . '::' . __FUNCTION__, []);
    $langcode = $data->get('langcode');
    $cache_key = $this->getCacheKey($entity, $langcode);

    if (empty($render_cache[$cache_key])) {
      $to_process = [];
      $to_render = [];

      array_push($to_process, $entity);
      array_push($to_render, $entity);
      while ($entity = array_shift($to_process)) {

        foreach ($entity->getFields() as $items) {
          $field_definition = $items->getFieldDefinition();

          if ($this->fieldValueManager->isParagraphsEditorField($field_definition)) {
            $wrapper = $this->fieldValueManager->wrapItems($items);
            foreach ($wrapper->getReferencedEntities() as $child_entity) {
              $to_render[] = $child_entity;
              $to_process[] = $child_entity;
            }
          }
          elseif ($this->fieldValueManager->isParagraphsField($field_definition)) {
            foreach ($this->fieldValueManager->getReferencedEntities($items) as $child_entity) {
              $to_process[] = $child_entity;
            }
          }
        }
      }

      $view_mode = $data->get('settings.view_mode');
      while ($entity = array_pop($to_render)) {
        $view = $this->viewBuilder->view($entity, $view_mode, $langcode);
        $render_cache[$this->getCacheKey($entity, $langcode)] = $this->renderer->render($view);
      }
    }

    return $render_cache[$cache_key];
  }

  /**
   * Gets a static cache key for en entity.
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   *   The entity to get the static cache key for.
   * @param string $langcode
   *   The language code for additional cache context.
   *
   * @return string
   *   The static cache key.
   */
  protected function getCacheKey(EntityInterface $entity, $langcode) {
    $keys = [$entity->uuid(), $entity->getRevisionId()];
    if ($langcode) {
      $keys[] = $langcode;
    }
    return implode(':', $keys);
  }

}
