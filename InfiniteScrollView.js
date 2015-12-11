'use strict';

let React = require('react-native');
let {InteractionManager} = React;
let ScrollableMixin = require('react-native-scrollable-mixin');
let {
  PropTypes,
  ScrollView,
  View,
} = React;

let autobind = require('autobind-decorator');
let cloneReferencedElement = require('react-native-clone-referenced-element');

let DefaultLoadingIndicator = require('./DefaultLoadingIndicator');

class InfiniteScrollView extends React.Component {
  static propTypes = {
    ...ScrollView.propTypes,
    distanceToLoadMore: PropTypes.number.isRequired,
    canLoadMore: PropTypes.bool.isRequired,
    onLoadError: PropTypes.func,
    onLoadMoreAsync: PropTypes.func.isRequired,
    renderLoadingIndicator: PropTypes.func.isRequired,
    renderLoadingErrorIndicator: PropTypes.func.isRequired,
  };

  static defaultProps = {
    distanceToLoadMore: 1500,
    canLoadMore: false,
    scrollEventThrottle: 100,
    renderLoadingIndicator: () => <DefaultLoadingIndicator />,
    renderLoadingErrorIndicator: () => <View />,
    renderScrollComponent: props => <ScrollView {...props} />,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      isDisplayingError: false,
    };
  }

  getScrollResponder(): ReactComponent {
    return this._scrollComponent.getScrollResponder();
  }

  setNativeProps(nativeProps) {
    this._scrollComponent.setNativeProps(nativeProps);
  }

  render() {
    let statusIndicator;

    if (this.state.isDisplayingError) {
      statusIndicator = React.cloneElement(
        this.props.renderLoadingErrorIndicator(
          { onRetryLoadMore: this._onLoadMoreAsync }
         ),
        { key: 'loading-error-indicator' },
      );
    } else if (this.props.canLoadMore) {
      statusIndicator = React.cloneElement(
        this.props.renderLoadingIndicator(),
        { key: 'loading-indicator' },
      );
    }

    let {
      renderScrollComponent,
      ...props,
    } = this.props;
    Object.assign(props, {
      onScroll: this._handleScroll.bind(this),
      children: [this.props.children, statusIndicator],
    });

    return cloneReferencedElement(renderScrollComponent(props), {
      ref: component => { this._scrollComponent = component; },
    });
  }

  _handleScroll(event) {
    if (this.props.onScroll) {
      this.props.onScroll(event);
    }

    if (this.state.isLoading || !this.props.canLoadMore ||
        this.state.isDisplayingError) {
      return;
    }

    if (this._distanceFromEnd(event) < this.props.distanceToLoadMore) {
      this._onLoadMoreAsync();
    }
  }

  @autobind
  async _onLoadMoreAsync() {
    if (this.state.isLoading && __DEV__) {
      throw new Error('_onLoadMoreAsync called while isLoading is true');
    }

    try {
      this.setState({isDisplayingError: false, isLoading: true});
      await this.props.onLoadMoreAsync();
    } catch (e) {
      this.props.onLoadError && this.props.onLoadError(e);
      this.setState({isDisplayingError: true});
    } finally {
      InteractionManager.runAfterInteractions() {
        this.setState({isLoading: false});
      });
    }
  }

  _distanceFromEnd(event): number {
    let {
      contentSize,
      contentInset,
      contentOffset,
      layoutMeasurement,
    } = event.nativeEvent;

    if (this.props.horizontal) {
      var contentLength = contentSize.width;
      var trailingInset = contentInset.right;
      var scrollOffset = contentOffset.x;
      var viewportLength = layoutMeasurement.width;
    } else {
      contentLength = contentSize.height;
      trailingInset = contentInset.bottom;
      scrollOffset = contentOffset.y;
      viewportLength = layoutMeasurement.height;
    }

    return contentLength + trailingInset - scrollOffset - viewportLength;
  }
}

Object.assign(InfiniteScrollView.prototype, ScrollableMixin);

module.exports = InfiniteScrollView;
