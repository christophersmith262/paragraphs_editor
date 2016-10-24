<?php

namespace Drupal\paragraphs_ckeditor\Plugin\Field\FieldWidget;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Form\FormState;
use Drupal\Core\Field\WidgetBase;
use Drupal\paragraphs\Plugin\Field\FieldWidget\InlineParagraphsWidget;
use Drupal\Component\Utility\Crypt;
use Drupal\paragraphs_ckeditor\CKEditorState\ParagraphsCKEditorState;
use Drupal\paragraphs_ckeditor\CKEditorState\ParagraphsCKEditorStateCacheInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\OpenModalDialogCommand;
use Drupal\Core\Ajax\HtmlCommand;

/**
 * Plugin implementation of the 'entity_reference paragraphs' widget.
 *
 * We hide add / remove buttons when translating to avoid accidental loss of
 * data because these actions effect all languages.
 *
 * @FieldWidget(
 *   id = "entity_reference_paragraphs_ckeditor",
 *   label = @Translation("Paragraphs (CKEditor)"),
 *   description = @Translation("CKEditor paragraphs form widget."),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class CkeditorParagraphsWidget extends InlineParagraphsWidget implements ContainerFactoryPluginInterface {

  protected $editorCache;

  /**
   * {@inheritdoc}
   */
  public function __construct($plugin_id, $plugin_definition, FieldDefinitionInterface $field_definition, array $settings, array $third_party_settings, ParagraphsCKEditorStateCacheInterface $editor_cache) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $third_party_settings);
    $this->editorCache = $editor_cache;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $plugin_id,
      $plugin_definition,
      $configuration['field_definition'],
      $configuration['settings'],
      $configuration['third_party_settings'],
      $container->get('paragraphs_ckeditor.editor_state_cache')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state) {
    return parent::formElement($items, $delta, $element, $form, $form_state);
  }

  public function formMultipleElements(FieldItemListInterface $items, array &$form, FormStateInterface $form_state, $get_delta = NULL) {

    $elements = parent::formMultipleElements($items, $form, $form_state, $get_delta);
    $command_emitter_id = \Drupal\Component\Utility\Html::getUniqueId('paragraphs-ckeditor-command-emitter');

    $elements['paragraphs_ckeditor'] = array(
      '#type' => 'container',
      '#attributes' => array('class' => array('paragraphs-ckeditor')),
    );

    $elements['paragraphs_ckeditor']['editor'] = array(
      '#type' => 'text_format',
      '#format' => 'paragraphs_ckeditor',
      '#attributes' => array('class' => array('paragraphs-ckeditor__editor')),
    );

    $elements['paragraphs_ckeditor']['command_emitter'] = array(
      '#type' => 'textfield',
      '#attributes' => array('class' => array(
        'paragraphs-ckeditor__command-emitter',
        'visually-hidden',
      )),
      '#ajax' => array(
        'callback' => array(get_class($this), 'ajaxProcessCKEditorCommand'),
        'event' => 'paragraphs-ckeditor-emit-command',
        'progress' => array(
          'message' => '',
        ),
      ),
      '#attached' => array(
        'library' => array(
          'paragraphs_ckeditor/ajax.command',
        )
      ),
    );

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function form(FieldItemListInterface $items, array &$form, FormStateInterface $form_state, $get_delta = NULL) {
    // Create the widget form element.
    $element = parent::form($items, $form, $form_state, $get_delta);

    // Load the widget state so we can set the widget build id, which associates
    // the widget instance with a collection of paragraph entities that are
    // referenced by the widget.
    $field_name = $this->fieldDefinition->getName();
    $parents = $form['#parents'];
    $widget_state = static::getWidgetState($parents, $field_name, $form_state);

    // Get the build id for this widget. For a new form this means generating a
    // new randomized build id. To do this we use the same method that is used
    // to generate form build ids in core. For a form that is being rebuilt, we
    // can simply read the existing build id from the widget state that is
    // derived from the form state. If we're creating a new build id, we'll also
    // want to store it in the widget state so we can refer back to it later.
    if (empty($widget_state['paragraphs_ckeditor']['widget_build_id'])) {
      $widget_build_id = Crypt::randomBytesBase64();
      $widget_state['paragraphs_ckeditor']['widget_build_id'] = $widget_build_id;
      static::setWidgetState($parents, $field_name, $form_state, $widget_state);
    }
    else {
      $widget_build_id = $widget_state['paragraphs_ckeditor']['widget_build_id'];
    }

    // If the form_state is about to be cached, we also want to rebuild the
    // editor state cache. This isn't strictly required for the editor to
    // continue working properly, but it keeps the cache from bloating with
    // unused paragraph entities. Note that on the first rendering of the form,
    // the state won't be cached. Since everything in the $items list will have
    // already been saved to the database, the ckeditor ajax endpoints only need
    // a uuid to reference existing items, thus the cache will only be created
    // if their are edits.
    if ($form_state->isCached()) {
      $editor_state = new ParagraphsCKEditorState($this->getAllowedTypes());

      foreach ($items as $delta => $item) {
        $editor_state->storeParagraph($item->entity);
      }

      $this->editorCache->setCache($widget_build_id, $editor_state);
    }

    // Attach the widget build id to the form element so the ckeditor plugin can
    // target the correct editor cache instance.
    $element['#attributes']['class'][] = 'paragraphs-ckeditor-widget';
    $element['#attributes']['data-paragraphs-ckeditor-build-id'] = $widget_build_id;
    $element['#attributes']['data-paragraphs-ckeditor-field-id'] = $this->fieldDefinition->uuid();

    return $element;
  }

  public static function ajaxProcessCKEditorCommand(array $form, FormStateInterface $form_state) {
    $command_emitter = $form_state->getTriggeringElement();
    $paragraphs_ckeditor = \Drupal\Component\Utility\NestedArray::getValue($form, array_slice($command_emitter['#array_parents'], 0, -1));
    $raw_command = $command_emitter['#value'];
    $command = json_decode($raw_command, TRUE);

    $selector = $paragraphs_ckeditor['#attributes']['data-drupal-selector'];
    $id = $command['id'];

    $command_name = NULL;
    if (!empty($command['name'])) {
      if (preg_match('/^[a-z\-]{1,20}$/', $command['name'])) {
        $command_name = $command['name'];
        unset($command['name']);
      }
      else {
        throw new \Exception('Command name must be composed of alpha characters and must not exceed 20 characters.');
      }
    }

    $renderer = \Drupal::service('renderer');
    $render_context = new \Drupal\Core\Render\RenderContext();
    $form_class = 'Drupal\system\Form\SiteInformationForm';
    $subform_state = new FormState();
    $callable = function() use ($form_class, &$subform_state) {
      return \Drupal::formBuilder()->getForm($form_class, $subform_state);
    };
    $form = $renderer->executeInRenderContext($render_context, $callable);
    $output = $renderer->renderRoot($form);


    $title = $subform_state->get('title') ? : '';

    $response = new AjaxResponse();
    $form['#attached']['library'][] = 'core/drupal.dialog.ajax';
    $response->setAttachments($form['#attached']);
    //$response->addCommand(new OpenModalDialogCommand($title, $output));
    $response->addCommand(new \Drupal\paragraphs_ckeditor\Ajax\ParagraphsCKEditorDataCommand($selector, $command['id'], $command['data']));
    return $response;
  }
}
