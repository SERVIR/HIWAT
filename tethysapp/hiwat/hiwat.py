import datetime
import time
import sys
import os, shutil
from ftplib import FTP
import numpy as np
from itertools import groupby
import tempfile, shutil,sys
import calendar
from tethysapp.hiwat.utils import *
from netCDF4 import Dataset
import netCDF4
from osgeo import gdal
from osgeo import osr
from osgeo import ogr
import requests
import random
from collections import defaultdict
from tethysapp.hiwat.config import ROOT_OUTPUT_DIR
import webcolors



try:
    HIWAT_DET = nc_files['det']
    HIWAT_HOURLY = nc_files['hourly']
    HIWAT_DAY1 = nc_files['day1']
    HIWAT_DAY2 = nc_files['day2']
except Exception as e:
    pass

def extractRasters(filename,suffix):

    output_dir = os.path.join(ROOT_OUTPUT_DIR, suffix)

    lis_fid = Dataset(filename, 'r')  # Reading the netcdf file
    lis_var = lis_fid.variables  # Get the netCDF variables
    toexclude = ['latitude','longitude','time']

    for var in lis_var:
        if var not in toexclude:

            xsize, ysize, GeoT, Projection, NDV = get_netcdf_info(filename, var)
    # # print(xsize,ysize,GeoT)
    # date_str = file.split('_')[2][:8]

            # data = data[::-1, :]
            lat = lis_var['latitude'][:]
            lon = lis_var['longitude'][:]
            time = lis_var['time'][:]
            # xmin, ymin, xmax, ymax = [lon.min(), lat.min(), lon.max(), lat.max()]
            # nrows, ncols = np.shape(data)
            # xres = (xmax - xmin) / float(ncols)
            # yres = (ymax - ymin) / float(nrows)
            # geotransform = (xmin, xres, 0, ymax, 0, -yres)
            # print(geotransform,GeoT)
            # print(lat,lon)
            for timestep, v in enumerate(time):
                # print timestep,v
                dt_str = datetime.datetime.utcfromtimestamp(int(v)).strftime('%Y_%m_%d_%H_%M')
                f_name = var+'-'+dt_str+'.tif'
                data = lis_var[var][timestep,:,:]
                data = data[::-1, :]
                print(f_name)
                driver = gdal.GetDriverByName('GTiff')
                DataSet = driver.Create(os.path.join(output_dir,f_name), xsize, ysize, 1, gdal.GDT_Float32)
                DataSet.SetGeoTransform(GeoT)
                srs = osr.SpatialReference()
                srs.ImportFromEPSG(4326)
                DataSet.SetProjection(srs.ExportToWkt())

                DataSet.GetRasterBand(1).WriteArray(data)
                DataSet.GetRasterBand(1).SetNoDataValue(NDV)
                DataSet.FlushCache()

                DataSet = None

def extractHourlyRasters(filename,suffix):

    output_dir = os.path.join(ROOT_OUTPUT_DIR, suffix)

    lis_fid = Dataset(filename, 'r')  # Reading the netcdf file
    lis_var = lis_fid.variables  # Get the netCDF variables
    toexclude = ['latitude','longitude','time']

    for var in lis_var:
        if var not in toexclude:
            # print var
            xsize, ysize, GeoT, Projection, NDV = get_netcdf_info(filename, var)
    # # print(xsize,ysize,GeoT)
    # date_str = file.split('_')[2][:8]

            # data = data[::-1, :]
            lat = lis_var['latitude'][:]
            lon = lis_var['longitude'][:]
            time = lis_var['time'][:]
            # xmin, ymin, xmax, ymax = [lon.min(), lat.min(), lon.max(), lat.max()]
            # nrows, ncols = np.shape(data)
            # xres = (xmax - xmin) / float(ncols)
            # yres = (ymax - ymin) / float(nrows)
            # geotransform = (xmin, xres, 0, ymax, 0, -yres)
            # print(geotransform,GeoT)
            # print(lat,lon)
            for timestep, v in enumerate(time):

                data = lis_var[var][timestep,:,:]
                data = data[::-1, :]
                dt_str = netCDF4.num2date(lis_var['time'][timestep],units = lis_var['time'].units,calendar = lis_var['time'].calendar)
                dt_str = datetime.datetime.strftime(dt_str,'%Y_%m_%d_%H_%M')
                f_name = var + '-' + dt_str + '.tif'
                print(f_name)
                driver = gdal.GetDriverByName('GTiff')
                DataSet = driver.Create(os.path.join(output_dir,f_name), xsize, ysize, 1, gdal.GDT_Float32)
                DataSet.SetGeoTransform(GeoT)
                srs = osr.SpatialReference()
                srs.ImportFromEPSG(4326)
                DataSet.SetProjection(srs.ExportToWkt())

                DataSet.GetRasterBand(1).WriteArray(data)
                DataSet.GetRasterBand(1).SetNoDataValue(NDV)
                DataSet.FlushCache()

                DataSet = None

def extractDailyRasters(filename,suffix):

    output_dir = os.path.join(ROOT_OUTPUT_DIR, suffix)

    lis_fid = Dataset(filename, 'r')  # Reading the netcdf file
    lis_var = lis_fid.variables  # Get the netCDF variables
    toexclude = ['latitude','longitude','time']

    for var in lis_var:
        if var not in toexclude:
            print(var)
            xsize, ysize, GeoT, Projection, NDV = get_netcdf_info(filename, var)

            lat = lis_var['latitude'][:]
            lon = lis_var['longitude'][:]

            data = lis_var[var][0,:,:]
            data = data[::-1, :]
            dt_str = suffix

            f_name = var + '-' + dt_str + '.tif'
            print(f_name)
            driver = gdal.GetDriverByName('GTiff')
            DataSet = driver.Create(os.path.join(output_dir,f_name), xsize, ysize, 1, gdal.GDT_Float32)
            DataSet.SetGeoTransform(GeoT)
            srs = osr.SpatialReference()
            srs.ImportFromEPSG(4326)
            DataSet.SetProjection(srs.ExportToWkt())

            DataSet.GetRasterBand(1).WriteArray(data)
            DataSet.GetRasterBand(1).SetNoDataValue(NDV)
            DataSet.FlushCache()

            DataSet = None
#Get info from the netCDF file. This info will be used to convert the shapefile to a raster layer
def get_netcdf_info(filename,var_name):

    nc_file = gdal.Open(filename)

    if nc_file is None:
        sys.exit()

    #There are more than two variables, so specifying the lwe_thickness variable

    if nc_file.GetSubDatasets() > 1:
        subdataset = 'NETCDF:"'+filename+'":'+var_name #Specifying the subset name
        src_ds_sd = gdal.Open(subdataset) #Reading the subset
        NDV = src_ds_sd.GetRasterBand(1).GetNoDataValue() #Get the nodatavalues
        xsize = src_ds_sd.RasterXSize #Get the X size
        ysize = src_ds_sd.RasterYSize #Get the Y size
        GeoT = src_ds_sd.GetGeoTransform() #Get the GeoTransform
        Projection = osr.SpatialReference() #Get the SpatialReference
        Projection.ImportFromWkt(src_ds_sd.GetProjectionRef()) #Setting the Spatial Reference
        src_ds_sd = None #Closing the file
        nc_file = None #Closing the file

        return xsize,ysize,GeoT,Projection,NDV #Return data that will be used to convert the shapefile

def gen_dropdown_opts(file,category):
    options = []

    nc = Dataset(file, 'r')
    nc_var = nc.variables  # Get the netCDF variables
    toexclude = ['longitude', 'time', 'latitude']

    for var in nc_var:
        if var not in toexclude:
            min = nc_var[var][:].min()
            max = nc_var[var][:].max()
            options.append({
                'id': var,
                'category':category,
                'display_name': nc_var[var].long_name,
                'units': nc_var[var].units,
                'min': str(min),
                'max': str(max),
            })

    return options

def update_var_info_file():
    nc_files = get_hiwat_file()
    try:
        HIWAT_DET = nc_files['det']
        HIWAT_HOURLY = nc_files['hourly']
        HIWAT_DAY1 = nc_files['day1']
        HIWAT_DAY2 = nc_files['day2']
    except Exception as e:
        pass

    db_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'public/data/var_info.txt')
    det_var_options = gen_dropdown_opts(HIWAT_DET,'det')
    hourly_var_options = gen_dropdown_opts(HIWAT_HOURLY,'hourly')
    day1_var_options = gen_dropdown_opts(HIWAT_DAY1,'day1')
    day2_var_options = gen_dropdown_opts(HIWAT_DAY2,'day2')

    with open(db_file, mode='a') as f:
        for item in hourly_var_options:
            f_str = item["id"]+"|"+item["category"]+"|"+item["display_name"]+"|"+item["units"]+"|"+item["min"]+"|"+item["max"]+'\n'
            f.write(f_str)
        for item in det_var_options:
            f_str = item["id"] + "|" + item["category"] + "|" + item["display_name"] + "|" + item["units"] + "|" + item[
                "min"] + "|" + item["max"] + '\n'
            f.write(f_str)
        for item in day1_var_options:
            f_str = item["id"] + "|" + item["category"] + "|" + item["display_name"] + "|" + item["units"] + "|" + item[
                "min"] + "|" + item["max"] + '\n'
            f.write(f_str)
        for item in day2_var_options:
            f_str = item["id"] + "|" + item["category"] + "|" + item["display_name"] + "|" + item["units"] + "|" + item[
                "min"] + "|" + item["max"] + '\n'
            f.write(f_str)

def upload_tiff(dir,geoserver_rest_url,workspace,uname,pwd):

    headers = {
        'Content-type': 'image/tiff',
    }

    for file in sorted(os.listdir(dir)): #Looping through all the files in the given directory
        if file is None:
            print ("No files. Please check directory and try again.")
            sys.exit()
        if file.endswith('.tif'):
            data = open(os.path.join(dir,file),'rb').read() #Read the file

            store_name = str(file[:-4]) #Creating the store name dynamically
            print(store_name)
            request_url = '{0}workspaces/{1}/coveragestores/{2}/file.geotiff'.format(geoserver_rest_url,workspace,store_name) #Creating the rest url
            # # print(request_url)
            requests.put(request_url,verify=False,headers=headers,data=data,auth=(uname,pwd)) #Creating the resource on the geoserver

def det_time_options(filename, suffix):
    date_options = []
    try:

        lis_fid = Dataset(filename, 'r')  # Reading the netcdf file
        lis_var = lis_fid.variables  # Get the netCDF variables
        toexclude = ['latitude', 'longitude', 'time']

        time = lis_var['time'][:]

        for timestep, v in enumerate(time):
            # print timestep,v
            dt_str = datetime.datetime.utcfromtimestamp(int(v)).strftime('%Y_%m_%d_%H_%M')
            dt_view = datetime.datetime.utcfromtimestamp(int(v)).strftime('%Y %m %d %H:%M')
            date_options.append([dt_str,dt_view])

    except Exception as e:
        pass

    return date_options


def hourly_time_options(filename, suffix):
    date_options = []

    try:

        lis_fid = Dataset(filename, 'r')  # Reading the netcdf file
        lis_var = lis_fid.variables  # Get the netCDF variables
        time = lis_var['time'][:]


        for timestep, v in enumerate(time):

            dt_str = netCDF4.num2date(lis_var['time'][timestep], units=lis_var['time'].units,
                                      calendar=lis_var['time'].calendar)
            dt_str2 = datetime.datetime.strftime(dt_str, '%Y_%m_%d_%H_%M')
            dt_view = datetime.datetime.strftime(dt_str, '%Y %m %d %H:%M')
            date_options.append([dt_str2,dt_view])

    except Exception as e:
        pass

    return date_options



# retrieve_colors('tmp2m')
# hourly_time_options(HIWAT_HOURLY,'hourly')
# extractRasters(HIWAT_DET,'det')
# extractHourlyRasters(HIWAT_HOURLY,'hourly')
# extractDailyRasters(HIWAT_DAY1,'day1')
# extractDailyRasters(HIWAT_DAY2,'day2')
# extractRasters(HIWAT_DAY2,'day2')
#update_var_info_file()
# upload_tiff('/media/sf_Downloads/hiwat_data/hourly/','https://tethysdev.servirglobal.net/geoserver/rest/','hiwathourly','admin','Tethys2018')
