from tethys_sdk.base import TethysAppBase, url_map_maker


class Hiwat(TethysAppBase):
    """
    Tethys app class for HIWAT.
    """

    name = 'HIWAT'
    index = 'hiwat:home'
    icon = 'hiwat/images/logo.png'
    package = 'hiwat'
    root_url = 'hiwat'
    color = '#c0392b'
    description = 'View latest HIWAT data'
    tags = 'Weather'
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='hiwat/test',
                controller='hiwat.controllers.home'
            ),
            UrlMap(
                name='leaf',
                url='hiwat',
                controller='hiwat.controllers.leaf'
            ),
            UrlMap(
                name='get-ts',
                url='hiwat/get-ts',
                controller='hiwat.ajax_controllers.get_ts'
            ),
            UrlMap(
                name='get-point-ts',
                url='hiwat/api/getPointTimeseries',
                controller='hiwat.api.get_point_ts'
            ),
            UrlMap(
                name='get-polygon-ts',
                url='hiwat/api/getPolygonTimeseries',
                controller='hiwat.api.get_polygon_ts'
            ),
        )

        return url_maps
